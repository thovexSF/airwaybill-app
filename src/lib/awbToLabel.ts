import { AWBData } from '../types/awb'
import { LabelData, defaultLabelData } from '../types/label'

/** Prefill an air cargo label from the open MAWB; the user edits from there. */
export function awbToLabel(awb: AWBData): LabelData {
  const pieces = (awb.rateItems || []).reduce((s, r) => s + (parseInt(r.pieces) || 0), 0)
  const weight = (awb.rateItems || []).reduce((s, r) => s + (parseFloat(r.grossWeight) || 0), 0)
  const totalPieces = pieces > 0 ? String(pieces) : '1'

  return {
    ...defaultLabelData,
    airline: awb.carrierName || '',
    awbPrefix: awb.awbPrefix || '',
    awbSerial: awb.awbSerial || '',
    departure: awb.awbAirportCode || awb.airportOfDeparture || '',
    destination: awb.airportOfDestination || '',
    agent: awb.agentNameAndCity || '',
    mawbPackages: pieces > 0 ? String(pieces) : '',
    mawbWeight: weight > 0 ? String(weight) : '',
    totalPieces,
    pieceNumber: '1',
  }
}
