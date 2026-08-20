/**
 * The Conditions of Contract printed on the reverse of every air waybill —
 * IATA Resolution 600b, the same wording every carrier reproduces.
 *
 * Held as text and typeset by `AwbConditionsPage`, not embedded as a picture of
 * somebody else's printed sheet: the same reasoning as the face of the form,
 * where the coordinates were measured rather than copied. Transcribed from the
 * text layer of a 2011 reference waybill and checked back against it word for
 * word by `scripts/check-conditions.mjs`.
 *
 * `n` is the clause number as printed; an empty `n` continues the previous
 * clause as an unnumbered definition block.
 */
export interface Clause {
  n: string
  text: string
}

export const CONDITIONS_NOTICE_TITLE = 'NOTICE CONCERNING CARRIER’S LIMITATION OF LIABILITY'

export const CONDITIONS_NOTICE =
  'If the carriage involves an ultimate destination or stop in a country other than the country of departure, ' +
  'the Montreal Convention or the Warsaw Convention may be applicable to the liability of the Carrier in respect ' +
  "of loss of, damage or delay to cargo. Carrier's limitation of liability in accordance with those Conventions " +
  'shall be as set forth in subparagraph 4 unless a higher value is declared.'

export const CONDITIONS_TITLE = 'CONDITIONS OF CONTRACT'

export const CONDITIONS: Clause[] = [
  { n: '1.', text: 'In this contract and the Notices appearing hereon:' },
  { n: '', text: 'CARRIER includes the air carrier issuing this air waybill and all carriers that carry or undertake to carry the cargo or perform any other services related to such carriage.' },
  { n: '', text: 'SPECIAL DRAWING RIGHT (SDR) is a Special Drawing Right as defined by the International Monetary Fund.' },
  { n: '', text: 'WARSAW CONVENTION means whichever of the following instruments is applicable to the contract of carriage:' },
  { n: '', text: 'the Convention for the Unification of Certain Rules Relating to International Carriage by Air, signed at Warsaw, 12 October 1929;' },
  { n: '', text: 'that Convention as amended at The Hague on 28 September 1955;' },
  { n: '', text: 'that Convention as amended at The Hague 1955 and by Montreal Protocol No. 1, 2, or 4 (1975) as the case may be.' },
  { n: '', text: 'MONTREAL CONVENTION means the Convention for the Unification of Certain Rules for International Carriage by Air, done at Montreal on 28 May 1999.' },

  { n: '2.1', text: 'Carriage is subject to the rules relating to liability established by the Warsaw Convention or the Montreal Convention unless such carriage is not “international carriage” as defined by the applicable Conventions.' },
  { n: '2.2', text: 'To the extent not in conflict with the foregoing, carriage and other related services performed by each Carrier are subject to:' },
  { n: '2.2.1', text: 'applicable laws and government regulations;' },
  { n: '2.2.2', text: 'provisions contained in the air waybill, Carrier’s conditions of carriage and related rules, regulations, and timetables (but not the times of departure and arrival stated therein) and applicable tariffs of such Carrier, which are made part hereof, and which may be inspected at any airports or other cargo sales offices from which it operates regular services. When carriage is to/from the USA, the shipper and the consignee are entitled, upon request, to receive a free copy of the Carrier’s conditions of carriage. The Carrier’s conditions of carriage include, but are not limited to:' },
  { n: '2.2.2.1', text: 'limits on the Carrier’s liability for loss, damage or delay of goods, including fragile or perishable goods;' },
  { n: '2.2.2.2', text: 'claims restrictions, including time periods within which shippers or consignees must file a claim or bring an action against the Carrier for its acts or omissions, or those of its agents;' },
  { n: '2.2.2.3', text: 'rights, if any, of the Carrier to change the terms of the contract;' },
  { n: '2.2.2.4', text: 'rules about Carrier’s right to refuse to carry;' },
  { n: '2.2.2.5', text: 'rights of the Carrier and limitations concerning delay or failure to perform service, including schedule changes, substitution of alternate Carrier or aircraft and rerouting.' },

  { n: '3.', text: 'The agreed stopping places (which may be altered by Carrier in case of necessity) are those places, except the place of departure and place of destination, set forth on the face hereof or shown in Carrier’s timetables as scheduled stopping places for the route. Carriage to be performed hereunder by several successive Carriers is regarded as a single operation.' },
  { n: '4.', text: 'For carriage to which the Montreal Convention does not apply, Carrier’s liability limitation for cargo lost, damaged or delayed shall be 19 SDRs per kilogram unless a greater per kilogram monetary limit is provided in any applicable Convention or in Carrier’s tariffs or general conditions of carriage.' },

  { n: '5.1', text: 'Except when the Carrier has extended credit to the consignee without the written consent of the shipper, the shipper guarantees payment of all charges for the carriage due in accordance with Carrier’s tariff, conditions of carriage and related regulations, applicable laws (including national laws implementing the Warsaw Convention and the Montreal Convention), government regulations, orders and requirements.' },
  { n: '5.2', text: 'When no part of the consignment is delivered, a claim with respect to such consignment will be considered even though transportation charges thereon are unpaid.' },

  { n: '6.1', text: 'For cargo accepted for carriage, the Warsaw Convention and the Montreal Convention permit shipper to increase the limitation of liability by declaring a higher value for carriage and paying a supplemental charge if required.' },
  { n: '6.2', text: 'In carriage to which neither the Warsaw Convention nor the Montreal Convention applies Carrier shall, in accordance with the procedures set forth in its general conditions of carriage and applicable tariffs, permit shipper to increase the limitation of liability by declaring a higher value for carriage and paying a supplemental charge if so required.' },

  { n: '7.1', text: 'In cases of loss of, damage or delay to part of the cargo, the weight to be taken into account in determining Carrier’s limit of liability shall be only the weight of the package or packages concerned.' },
  { n: '7.2', text: 'Notwithstanding any other provisions, for “foreign air transportation” as defined by the U.S. Transportation Code:' },
  { n: '7.2.1', text: 'in the case of loss of, damage or delay to a shipment, the weight to be used in determining Carrier’s limit of liability shall be the weight which is used to determine the charge for carriage of such shipment; and' },
  { n: '7.2.2', text: 'in the case of loss of, damage or delay to a part of a shipment, the shipment weight in 7.2.1 shall be prorated to the packages covered by the same air waybill whose value is affected by the loss, damage or delay. The weight applicable in the case of loss or damage to one or more articles in a package shall be the weight of the entire package.' },

  { n: '8.', text: 'Any exclusion or limitation of liability applicable to Carrier shall apply to Carrier’s agents, employees, and representatives and to any person whose aircraft or equipment is used by Carrier for carriage and such person’s agents, employees and representatives.' },
  { n: '9.', text: 'Carrier undertakes to complete the carriage with reasonable dispatch. Where permitted by applicable laws, tariffs and government regulations, Carrier may use alternative carriers, aircraft or modes of transport without notice but with due regard to the interests of the shipper. Carrier is authorized by the shipper to select the routing and all intermediate stopping places that it deems appropriate or to change or deviate from the routing shown on the face hereof.' },
  { n: '10.', text: 'Receipt by the person entitled to delivery of the cargo without complaint shall be prima facie evidence that the cargo has been delivered in good condition and in accordance with the contract of carriage.' },
  { n: '10.1', text: 'In the case of loss of, damage or delay to cargo a written complaint must be made to Carrier by the person entitled to delivery. Such complaint must be made:' },
  { n: '10.1.1', text: 'in the case of damage to the cargo, immediately after discovery of the damage and at the latest within 14 days from the date of receipt of the cargo;' },
  { n: '10.1.2', text: 'in the case of delay, within 21 days from the date on which the cargo was placed at the disposal of the person entitled to delivery.' },
  { n: '10.1.3', text: 'in the case of non-delivery of the cargo, within 120 days from the date of issue of the air waybill, or if an air waybill has not been issued, within 120 days from the date of receipt of the cargo for transportation by the Carrier.' },
  { n: '10.2', text: 'Such complaint may be made to the Carrier whose air waybill was used, or to the first Carrier or to the last Carrier or to the Carrier, which performed the carriage during which the loss, damage or delay took place.' },
  { n: '10.3', text: 'Unless a written complaint is made within the time limits specified in 10.1 no action may be brought against Carrier.' },
  { n: '10.4', text: 'Any rights to damages against Carrier shall be extinguished unless an action is brought within two years from the date of arrival at the destination, or from the date on which the aircraft ought to have arrived, or from the date on which the carriage stopped.' },
  { n: '11.', text: 'Shipper shall comply with all applicable laws and government regulations of any country to or from which the cargo may be carried, including those relating to the packing, carriage or delivery of the cargo, and shall furnish such information and attach such documents to the air waybill as may be necessary to comply with such laws and regulations. Carrier is not liable to shipper and shipper shall indemnify Carrier for loss or expense due to shipper’s failure to comply with this provision.' },
  { n: '12.', text: 'No agent, employee or representative of Carrier has authority to alter, modify or waive any provisions of this contract.' },
]
