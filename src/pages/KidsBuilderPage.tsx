import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './KidsBuilderPage.css'

type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'flower'

const BLOCKS: { type: BlockType; label: string; emoji: string; background: string }[] = [
  { type: 'grass', label: 'Pasto', emoji: '🌱', background: 'linear-gradient(160deg, #a7e08a, #6fbf58)' },
  { type: 'dirt', label: 'Tierra', emoji: '🟫', background: 'linear-gradient(160deg, #c99a6a, #9a6a3f)' },
  { type: 'stone', label: 'Piedra', emoji: '🪨', background: 'linear-gradient(160deg, #c3c3c3, #8f8f8f)' },
  { type: 'wood', label: 'Madera', emoji: '🪵', background: 'linear-gradient(160deg, #d8a85c, #a97b3a)' },
  { type: 'flower', label: 'Flor', emoji: '🌸', background: 'linear-gradient(160deg, #f5b8e0, #e07fc0)' },
]

const GRID_SIZE = 6
const CELL_COUNT = GRID_SIZE * GRID_SIZE
const CELEBRATE_AT = 8

export function KidsBuilderPage() {
  const [cells, setCells] = useState<(BlockType | null)[]>(() => Array(CELL_COUNT).fill(null))
  const [selected, setSelected] = useState<BlockType>('grass')
  const [lastPlaced, setLastPlaced] = useState<number | null>(null)
  const [celebrated, setCelebrated] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const placedCount = cells.filter(Boolean).length

  useEffect(() => {
    if (!celebrated && placedCount >= CELEBRATE_AT) {
      setCelebrated(true)
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [placedCount, celebrated])

  function handleCellClick(index: number) {
    setCells(prev => {
      const next = [...prev]
      next[index] = next[index] ? null : selected
      return next
    })
    setLastPlaced(index)
  }

  function handleReset() {
    setCells(Array(CELL_COUNT).fill(null))
    setLastPlaced(null)
    setCelebrated(false)
    setShowCelebration(false)
  }

  return (
    <div className="kb-page">
      <Link to="/" className="kb-back">&larr; Volver al inicio</Link>
      <h1 className="kb-title">🧱 Mini Mundo de Bloques</h1>
      <p className="kb-subtitle">
        Un juego cortito, sin puntajes, sin tiempo límite y sin publicidad. Elige un bloque
        y toca la cuadrícula para construir algo bonito junto a Cubi. ¡Toca un bloque otra
        vez para quitarlo!
      </p>

      <div className="kb-palette">
        {BLOCKS.map(block => (
          <button
            key={block.type}
            type="button"
            className={`kb-swatch${selected === block.type ? ' selected' : ''}`}
            style={{ background: block.background }}
            onClick={() => setSelected(block.type)}
            aria-label={block.label}
            title={block.label}
          >
            {block.emoji}
          </button>
        ))}
      </div>

      <div className="kb-board-wrap">
        <div
          className="kb-board"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 52px)` }}
        >
          {cells.map((cell, i) => {
            const blockDef = cell ? BLOCKS.find(b => b.type === cell) : null
            return (
              <div key={i} className="kb-cell" onClick={() => handleCellClick(i)}>
                {i === lastPlaced && (
                  <span className="kb-character">🐇</span>
                )}
                {blockDef && (
                  <span className="kb-block" style={{ background: blockDef.background }}>
                    {blockDef.emoji}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="kb-controls">
        <button type="button" className="kb-btn" onClick={handleReset}>
          🔄 Empezar de nuevo
        </button>
      </div>

      {showCelebration && (
        <div className="kb-celebration">
          🎉 ¡Muy bien! Construiste algo genial junto a Cubi. 🎉
        </div>
      )}
    </div>
  )
}
