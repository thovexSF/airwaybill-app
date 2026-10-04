#!/usr/bin/env python3
"""
Vectoriza la hoja IATA en blanco (public/awb-copies/1.png) para que se imprima
nítida a cualquier zoom, y escribe src/pdf/awbSheet.ts.

  python3 scripts/trace-awb-sheet.py

La hoja sale como (a) contornos de la tinta, trazados a 50 % de cobertura con
interpolación lineal sobre el antialiasing del PNG (marching squares, solo PIL), y
(b) los rectángulos de color de las zonas sombreadas. La tinta y el sombreado se
pintan con los colores de cada copia (awbCopyTheme), así que basta una sola hoja.

El rótulo rojo "Original N (for …)" del pie varía por copia y no se traza: se
excluye aquí y AWBDocument lo imprime como texto.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'awb-copies' / '1.png'
OUT = ROOT / 'src' / 'pdf' / 'awbSheet.ts'

PAGE_W, PAGE_H = 612.0, 792.0
INK_G = 105          # canal verde de la tinta de la copia 1 (0,105,0)
WASH = (205, 255, 205)
# Región del rótulo "Original N (for …)", en pt: se excluye del trazado.
LABEL_BOX = (340.0, 754.0, 612.0, 792.0)
UNITS = 20          # unidades del trazado por pt (viewBox 12240 x 15840)
EPS_PX = 0.2         # tolerancia de simplificación, en píxeles del PNG


def main() -> None:
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    sx, sy = PAGE_W / w, PAGE_H / h
    g = im.split()[1].tobytes()

    lx0, ly0, lx1, ly1 = (int(LABEL_BOX[0] / sx), int(LABEL_BOX[1] / sy), w, h)

    def cov(x: int, y: int) -> float:
        if x < 0 or y < 0 or x >= w or y >= h:
            return 0.0
        if x >= lx0 and y >= ly0:
            return 0.0
        v = (255 - g[y * w + x]) / (255 - INK_G)
        return 1.0 if v > 1 else (0.0 if v < 0 else v)

    # celdas (x, y) = esquina superior izquierda, con algún vértice entintado
    cells = set()
    for y in range(h):
        row = g[y * w:(y + 1) * w]
        for x in range(w):
            if row[x] < 255:
                for dx in (-1, 0):
                    for dy in (-1, 0):
                        cells.add((x + dx, y + dy))

    def point(edge):
        kind, x, y, t = edge
        return (x + 0.5 + t, y + 0.5) if kind == 0 else (x + 0.5, y + 0.5 + t)

    # arista = (tipo, x, y); t se calcula al convertir
    adj: dict = {}
    tval: dict = {}

    def crossing(kind: int, x: int, y: int) -> None:
        if (kind, x, y) in tval:
            return
        a = cov(x, y)
        b = cov(x + 1, y) if kind == 0 else cov(x, y + 1)
        tval[(kind, x, y)] = (0.5 - a) / (b - a) if b != a else 0.5

    def link(e1, e2) -> None:
        crossing(*e1)
        crossing(*e2)
        adj.setdefault(e1, []).append(e2)
        adj.setdefault(e2, []).append(e1)

    for (x, y) in cells:
        tl, tr, br, bl = cov(x, y) >= 0.5, cov(x + 1, y) >= 0.5, cov(x + 1, y + 1) >= 0.5, cov(x, y + 1) >= 0.5
        top, right, bottom, left = (0, x, y), (1, x + 1, y), (0, x, y + 1), (1, x, y)
        sw = (tl, tr, br, bl)
        n = sum(sw)
        if n in (0, 4):
            continue
        cross = []
        if tl != tr: cross.append(top)
        if tr != br: cross.append(right)
        if br != bl: cross.append(bottom)
        if bl != tl: cross.append(left)
        if len(cross) == 2:
            link(cross[0], cross[1])
        else:  # silla
            centre = (cov(x, y) + cov(x + 1, y) + cov(x + 1, y + 1) + cov(x, y + 1)) / 4 >= 0.5
            if tl and br:
                pairs = [(top, right), (bottom, left)] if centre else [(top, left), (bottom, right)]
            else:
                pairs = [(top, left), (right, bottom)] if centre else [(top, right), (bottom, left)]
            for a, b in pairs:
                link(a, b)

    def xy(e):
        kind, x, y = e
        t = tval[e]
        return (x + 0.5 + t, y + 0.5) if kind == 0 else (x + 0.5, y + 0.5 + t)

    # recorre los contornos cerrados
    seen = set()
    loops = []
    for start in adj:
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            nxt = [e for e in adj[cur] if e != prev] or adj[cur]
            cand = [e for e in nxt if e not in seen]
            if not cand:
                break
            prev, cur = cur, cand[0]
            seen.add(cur)
            loop.append(cur)
        loops.append([xy(e) for e in loop])

    def dp(pts, eps):
        if len(pts) < 3:
            return pts
        (x0, y0), (x1, y1) = pts[0], pts[-1]
        dx, dy = x1 - x0, y1 - y0
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-9
        idx, dmax = 0, 0.0
        for i in range(1, len(pts) - 1):
            d = abs(dy * (pts[i][0] - x0) - dx * (pts[i][1] - y0)) / norm
            if d > dmax:
                idx, dmax = i, d
        if dmax <= eps:
            return [pts[0], pts[-1]]
        return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)

    def simplify(loop):
        # contorno cerrado: parte por el punto más lejano del primero
        far = max(range(len(loop)), key=lambda i: (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2)
        a = dp(loop[:far + 1], EPS_PX)
        b = dp(loop[far:] + [loop[0]], EPS_PX)
        return a[:-1] + b[:-1]

    parts = []
    for loop in loops:
        if len(loop) < 4:
            continue
        s = simplify(loop)
        if len(s) < 3:
            continue
        # enteros en 1/20 pt; tras el primer punto, solo desplazamientos relativos
        pts = [(round(p[0] * sx * UNITS), round(p[1] * sy * UNITS)) for p in s]
        deltas = [f'{b[0] - a[0]} {b[1] - a[1]}' for a, b in zip(pts, pts[1:])]
        parts.append(f'M{pts[0][0]} {pts[0][1]}l' + ' '.join(deltas) + 'z')
    path = ''.join(parts)

    # zonas sombreadas: tramos del color exacto, fusionados en rectángulos
    px = im.load()
    rects = {}
    done = []
    for y in range(h):
        x = 0
        row_runs = []
        while x < w:
            if px[x, y] == WASH:
                x0 = x
                while x < w and px[x, y] == WASH:
                    x += 1
                if x - x0 >= 3:
                    row_runs.append((x0, x))
            else:
                x += 1
        cur = {}
        for run in row_runs:
            if run in rects and rects[run][1] == y - 1:
                cur[run] = (rects[run][0], y)
            else:
                if run in rects:
                    done.append((run, rects[run]))
                cur[run] = (y, y)
        for run in list(rects):
            if run not in cur:
                done.append((run, rects[run]))
        rects = cur
    done += [(r, v) for r, v in rects.items()]
    wash = [
        [round(r[0] * sx, 2), round(v[0] * sy, 2), round((r[1] - r[0]) * sx, 2), round((v[1] - v[0] + 1) * sy, 2)]
        for r, v in done if v[1] - v[0] >= 2
    ]

    out = (
        '// Generado por scripts/trace-awb-sheet.py a partir de public/awb-copies/1.png. No editar a mano.\n'
        '// Contornos de la tinta de la hoja IATA y rectángulos de las zonas sombreadas, en pt (US Letter).\n'
        f'export const SHEET_INK_PATH = {path!r}\n\n'
        f'export const SHEET_WASH: [number, number, number, number][] = {wash!r}\n'
    )
    OUT.write_text(out)
    print(f'{len(loops)} contornos, {len(path) / 1024:.0f} KB de trazado, {len(wash)} zonas sombreadas')


if __name__ == '__main__':
    sys.exit(main())
