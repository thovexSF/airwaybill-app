import React from 'react'
import { Party, PartyContact, CONTACT_TYPES } from '../types/edi'
import { Row, Field } from './DocForm'

/**
 * Cargo-IMP party block (shipper / consignee): name, address and the
 * contact list that becomes the `/TE/…` `/EM/…` lines of the message.
 */
export function PartyFields({ title, party, onChange }: {
  title: string
  party: Party
  onChange: (p: Party) => void
}) {
  const set = <K extends keyof Party>(key: K) => (value: Party[K]) =>
    onChange({ ...party, [key]: value })

  const setContact = (index: number, patch: Partial<PartyContact>) =>
    onChange({ ...party, contacts: party.contacts.map((c, i) => i === index ? { ...c, ...patch } : c) })

  const addContact = () => onChange({ ...party, contacts: [...party.contacts, { type: 'TE', value: '' }] })
  const removeContact = (index: number) =>
    onChange({ ...party, contacts: party.contacts.filter((_, i) => i !== index) })

  return (
    <div className="form-section">
      <div className="section-title">{title}</div>
      <Row>
        <Field label="Account Number" value={party.accountNumber} onChange={set('accountNumber')} />
        <Field label="Name" value={party.name} onChange={set('name')} />
      </Row>
      <Row>
        <Field label="Street Address" value={party.street} onChange={set('street')} />
      </Row>
      <Row>
        <Field label="Place / City" value={party.place} onChange={set('place')} placeholder="SANTIAGO" />
        <Field label="State" value={party.state} onChange={set('state')} placeholder="RM" />
        <Field label="Country" value={party.country} onChange={set('country')} placeholder="CL" />
        <Field label="Post Code" value={party.postCode} onChange={set('postCode')} />
      </Row>
      <div style={{ padding: '10px 12px' }}>
        <label style={{ fontSize: 11, color: 'var(--label)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Contacts
        </label>
        {party.contacts.map((c, i) => (
          <div key={i} className="other-charge-row">
            <select value={c.type} onChange={e => setContact(i, { type: e.target.value })}>
              {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={c.value} onChange={e => setContact(i, { value: e.target.value })} placeholder="+56 2 2481 0261" />
            <button className="btn-remove" onClick={() => removeContact(i)}>×</button>
          </div>
        ))}
        <button className="btn-add" onClick={addContact}>+ Add contact</button>
      </div>
    </div>
  )
}
