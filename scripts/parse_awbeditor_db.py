#!/usr/bin/env python3
"""Parse awbeditor.db → JSON for B2B import. Usage: python3 parse_awbeditor_db.py [db_path] [out.json]"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

DEFAULT_ZIP = Path.home() / "Downloads" / "awbeditor.zip"
DEFAULT_DB = Path("/tmp/awbeditor-db/awbeditor.db")
DEFAULT_OUT = Path("/tmp/awbeditor-import.json")


def decode(blob):
    if blob is None:
        return ""
    if isinstance(blob, str):
        return blob
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            return blob.decode(enc)
        except Exception:
            continue
    return blob.decode("latin-1", errors="replace")


def clean(s, max_len=None):
    if s is None:
        return ""
    s = re.sub(r"[ \t]+\n", "\n", str(s)).strip()
    s = re.sub(r"[ \t]{2,}", " ", s)
    if max_len and len(s) > max_len:
        return s[:max_len]
    return s


def txt(el, tag, default=""):
    if el is None:
        return default
    child = el.find(tag)
    if child is None or child.text is None:
        return default
    return clean(child.text)


def first_line(s):
    return clean(s).split("\n")[0].strip() if s else ""


def rest_lines(s):
    parts = clean(s).split("\n")
    return "\n".join(parts[1:]).strip() if len(parts) > 1 else ""


def awb_number(prefix, serial, fallback=""):
    p = clean(prefix)
    s = re.sub(r"\s+", "", clean(serial))
    if p and s:
        return f"{p}-{s}"
    if s:
        return s
    return clean(fallback)


def parse_date(s):
    s = clean(s)
    if not s:
        return None
    # dd-mm-yyyy or yyyy-mm-dd
    m = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    return None


def num(v, default=None):
    if v is None or v == "":
        return default
    try:
        return float(re.sub(r"[^\d.\-]", "", str(v)) or 0)
    except Exception:
        return default


def parse_awb_xml(root, dtype, meta):
    prefix = txt(root, "airline-prefix")
    serial = txt(root, "awb-serial-number")
    hawb = txt(root, "hawb")
    number = awb_number(prefix, serial, meta.get("document_number") or "")
    shipper = txt(root, "shipper-details") or meta.get("shipper") or ""
    consignee = txt(root, "consignee-details") or meta.get("consignee") or ""
    agent = txt(root, "agent-details")
    flights = [
        clean(x.text)
        for x in root.findall(".//requested-flight/string")
        if x.text and clean(x.text)
    ]
    routes_to = [clean(x.text) for x in root.findall("./route-to/string") if x.text]
    routes_by = [clean(x.text) for x in root.findall("./route-by/string") if x.text]

    rate_lines = []
    for it in root.findall("./items/awb-item"):
        dims = []
        for d in it.findall("./dimensions/FWBRateDescriptionDimensions"):
            dims.append(
                {
                    "pieces": int(num(txt(d, "numbeOfPieces"), 0) or 0),
                    "length": num(txt(d, "length")),
                    "width": num(txt(d, "widht")),
                    "height": num(txt(d, "height")),
                    "unit": txt(d, "unitCode") or "CMT",
                    "weight": num(txt(d, "weight")),
                    "weightUnit": txt(d, "weightCode") or "K",
                }
            )
        rate_lines.append(
            {
                "pieces": int(num(txt(it, "pieces"), 0) or 0),
                "grossWeight": num(txt(it, "gross-weight"), 0),
                "weightUnit": txt(it, "scale") or "K",
                "rateClass": txt(it, "rate-class"),
                "itemNo": txt(it, "item-number"),
                "chargeableWeight": num(txt(it, "chargeable-weight"), 0),
                "rate": num(txt(it, "rate-charge"), 0),
                "total": num(txt(it, "total"), 0),
                "natureAndQuantity": txt(it, "nature"),
                "dimensions": dims,
            }
        )

    other_charges = []
    for oc in root.findall("./other-charges/awb-other-charges"):
        other_charges.append(
            {
                "description": clean(txt(oc, "code") or txt(oc, "due")),
                "amount": num(txt(oc, "amount") or txt(oc, "charges"), 0) or 0,
                "entitlement": "DUE CARRIER"
                if "CARRIER" in (txt(oc, "due") or txt(oc, "code") or "").upper()
                else "DUE AGENT",
            }
        )

    wt_pay = (txt(root, "weight-payment-type") or "PREPAID").upper()
    other_pay = (txt(root, "other-charges-payment-type") or "PREPAID").upper()
    issue = parse_date(txt(root, "carrier-date")) or meta.get("document_date")

    payload = {
        "externalId": meta["id"],
        "awbNumber": number if dtype == 101 else None,
        "hawbNumber": hawb or (meta.get("document_number") if dtype == 102 else None),
        "masterAwbNumber": number if dtype == 102 else None,
        "awbPrefix": prefix,
        "awbSerial": serial,
        "issueDate": issue,
        "referenceNumber": txt(root, "reference-number") or meta.get("reference_number") or "",
        "issuer": first_line(txt(root, "issued-by-details")),
        "issuedBy": txt(root, "issued-by-details"),
        "shipperName": first_line(shipper),
        "shipperAddress": rest_lines(shipper),
        "consigneeName": first_line(consignee),
        "consigneeAddress": rest_lines(consignee),
        "shipperAccountNumber": txt(root, "shipper-account-number"),
        "consigneeAccountNumber": txt(root, "consignee-account-number"),
        "agentNameAndCity": agent,
        "agentIataCode": txt(root, "agent-iata-cargo-numeric-code"),
        "agentAccountNumber": txt(root, "agent-account-number"),
        "airportOfDeparture": txt(root, "airport-city-code-departure")
        or txt(root, "airport-departure")
        or meta.get("origin")
        or "",
        "airportOfDestination": txt(root, "airport-destination") or meta.get("destination") or "",
        "departureDisplay": txt(root, "airport-departure") or meta.get("origin") or "",
        "destinationDisplay": txt(root, "airport-destination") or meta.get("destination") or "",
        "requestedFlightsDates": " / ".join(flights),
        "flightNumber": flights[0] if flights else "",
        "routeTo1": routes_to[0] if len(routes_to) > 0 else "",
        "routeBy1": routes_by[0] if len(routes_by) > 0 else "",
        "routeTo2": routes_to[1] if len(routes_to) > 1 else "",
        "routeBy2": routes_by[1] if len(routes_by) > 1 else "",
        "routeTo3": routes_to[2] if len(routes_to) > 2 else "",
        "routeBy3": routes_by[2] if len(routes_by) > 2 else "",
        "currency": txt(root, "currency") or "USD",
        "chgsCode": txt(root, "charges-code") or "PP",
        "weightValuationCharges": "COLL" if "COLLECT" in wt_pay else "PPD",
        "otherChargesCode": "COLL" if "COLLECT" in other_pay else "PPD",
        "valueForCarriage": txt(root, "value-carrier") or "NVD",
        "valueForCustoms": txt(root, "value-customs") or "NCV",
        "insuranceAmount": txt(root, "insurance") or "XXX",
        "handlingInformation": txt(root, "handling-information"),
        "sci": txt(root, "sci"),
        "accountingInformation": txt(root, "accounting-information"),
        "optionalShippingInformation": txt(root, "optional-shipping-info"),
        "rateLines": rate_lines,
        "numberOfPieces": int(num(txt(root, "item-pieces"), 0) or 0),
        "grossWeight": num(txt(root, "item-weight"), 0),
        "weightUnit": txt(root, "item-weight-scale") or "K",
        "totalCharge": num(txt(root, "item-total"), 0),
        "natureAndQuantityOfGoods": rate_lines[0]["natureAndQuantity"] if rate_lines else "",
        "otherCharges": other_charges,
        "weightChargePrepaid": num(txt(root, "weight-charge"), 0) if "COLLECT" not in wt_pay else 0,
        "weightChargeCollect": num(txt(root, "weight-charge"), 0) if "COLLECT" in wt_pay else 0,
        "totalPrepaid": num(txt(root, "total-prepaid"), 0),
        "totalCollect": num(txt(root, "total-collect"), 0),
        "executedOnDate": issue,
        "executedAtPlace": txt(root, "carrier-place"),
        "signatureOfShipperOrAgent": txt(root, "shipper-signature"),
        "signatureOfIssuingCarrierOrAgent": txt(root, "carrier-signature"),
        "notes": txt(root, "notes"),
        "status": "completed",
        "formPayload": {"_source": "awbeditor", "externalId": meta["id"], "xmlRoot": root.tag},
    }
    if rate_lines:
        r0 = rate_lines[0]
        payload["chargeableWeight"] = r0.get("chargeableWeight")
        payload["rateCharge"] = r0.get("rate")
        payload["rateClass"] = r0.get("rateClass")
        payload["commodityItemNumber"] = r0.get("itemNo")
    return payload


def parse_dgd_xml(root, meta):
    shipper = txt(root, "shipper") or meta.get("shipper") or ""
    consignee = txt(root, "consignee") or meta.get("consignee") or ""
    awb = awb_number(txt(root, "awbAirlinePrefix"), txt(root, "awbSerialNumber"), meta.get("document_number") or "")
    items_wrap = root.find("items")
    items = list(items_wrap.findall("items")) if items_wrap is not None else []
    dangerous = []
    for it in items:
        dangerous.append(
            {
                "unNumber": txt(it, "un"),
                "properShippingName": txt(it, "name"),
                "class": txt(it, "division"),
                "packingGroup": txt(it, "packingGroup"),
                "quantity": txt(it, "quantity"),
                "packingInstruction": txt(it, "packingInst"),
                "authorization": txt(it, "authorization"),
                "additionalHazards": "",
            }
        )
    form_items = [
        {
            "unNumber": d["unNumber"],
            "properShippingName": d["properShippingName"],
            "classDiv": d["class"],
            "packingGroup": d["packingGroup"],
            "quantity": d["quantity"],
            "packingInstruction": d["packingInstruction"],
        }
        for d in dangerous
    ]
    return {
        "externalId": meta["id"],
        "dgdNumber": meta.get("document_number") or f"DGD-AE-{meta['id']}",
        "awbNumber": awb,
        "shipperName": first_line(shipper),
        "shipperAddress": rest_lines(shipper),
        "consigneeName": first_line(consignee),
        "consigneeAddress": rest_lines(consignee),
        "airportOfDeparture": txt(root, "airportOfDeparture") or meta.get("origin") or "",
        "airportOfDestination": txt(root, "airportOfDestination") or meta.get("destination") or "",
        "dangerousGoods": dangerous,
        "additionalInformation": txt(root, "handlingInformation"),
        "shipperSignature": txt(root, "nameSignatory"),
        "shipperSignatureDate": parse_date(txt(root, "place")),
        "status": "completed",
        "formPayload": {
            "_source": "awbeditor",
            "externalId": meta["id"],
            "awbNumber": awb,
            "shipper": shipper,
            "consignee": consignee,
            "airportOfDeparture": txt(root, "airportOfDeparture"),
            "airportOfDestination": txt(root, "airportOfDestination"),
            "aircraftLimitation": "CARGO AIRCRAFT ONLY"
            if txt(root, "cargoOnly") == "true"
            else "PASSENGER AND CARGO",
            "shipmentType": "RADIOACTIVE" if txt(root, "radioactive") == "true" else "NON-RADIOACTIVE",
            "shipperReference": txt(root, "referenceNumber"),
            "dgdNumber": meta.get("document_number") or f"DGD-AE-{meta['id']}",
            "items": form_items,
            "additionalHandling": txt(root, "handlingInformation"),
            "shipperSignature": txt(root, "nameSignatory"),
            "signatureDate": parse_date(txt(root, "place")) or "",
        },
    }


def ensure_db(db_path: Path, zip_path: Path):
    if db_path.exists() and db_path.stat().st_size > 1000:
        return db_path
    if zip_path.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extract("awbeditor.db", db_path.parent)
        return db_path
    raise SystemExit(f"No DB at {db_path} and no zip at {zip_path}")


def main():
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DB
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    ensure_db(db_path, DEFAULT_ZIP)

    con = sqlite3.connect(db_path)
    cur = con.cursor()
    rows = cur.execute(
        """
        SELECT id, document_type, document_number, master_document_number, reference_number,
               shipper, consignee, origin, destination, document_date, date_created, document_data
        FROM document WHERE status = 1
        ORDER BY document_type, id
        """
    ).fetchall()

    result = {"mawb": [], "hawb": [], "dgd": [], "errors": []}
    for (
        id_,
        dtype,
        num,
        master,
        ref,
        shipper,
        consignee,
        origin,
        dest,
        ddate,
        created,
        data,
    ) in rows:
        meta = {
            "id": id_,
            "document_number": num,
            "master_document_number": master,
            "reference_number": ref,
            "shipper": shipper,
            "consignee": consignee,
            "origin": origin,
            "destination": dest,
            "document_date": str(ddate)[:10] if ddate else (str(created)[:10] if created else None),
        }
        xml = decode(data)
        try:
            root = ET.fromstring(xml) if xml.strip() else None
        except ET.ParseError as e:
            result["errors"].append({"id": id_, "type": dtype, "error": str(e)})
            continue
        if root is None:
            result["errors"].append({"id": id_, "type": dtype, "error": "empty xml"})
            continue
        if dtype == 101:
            result["mawb"].append(parse_awb_xml(root, 101, meta))
        elif dtype == 102:
            result["hawb"].append(parse_awb_xml(root, 102, meta))
        elif dtype == 401:
            result["dgd"].append(parse_dgd_xml(root, meta))

    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=None), encoding="utf-8")
    print(
        json.dumps(
            {
                "out": str(out_path),
                "mawb": len(result["mawb"]),
                "hawb": len(result["hawb"]),
                "dgd": len(result["dgd"]),
                "errors": len(result["errors"]),
            }
        )
    )


if __name__ == "__main__":
    main()
