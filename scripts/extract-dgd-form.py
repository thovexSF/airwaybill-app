#!/usr/bin/env python3
"""
One-off generator for src/pdf/dgdForm.ts: the geometry of the Shipper's Declaration for Dangerous
Goods sheet, measured from a reference PDF (filled shapes + word positions), so DGDDocument can
redraw it as vectors instead of embedding somebody else's artwork.

    python3 scripts/extract-dgd-form.py "docs/company-refs/dgr en blanco.pdf" > src/pdf/dgdForm.ts

Needs `pypdf`. The reference carries a logo, "1 of 1" and strike-outs that are filled-in values, not
form furniture: the image is skipped and WORD_BLOCKLIST drops the rest.
"""
import re, sys, json
import pypdf
from pypdf.generic import ContentStream

PAGE_H = 792.0

def mul(m, n):  # row-vector convention: result = m x n
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return [a*A + b*C, a*B + b*D, c*A + d*C, c*B + d*D, e*A + f*C + E, e*B + f*D + F]

def apply(m, x, y):
    return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])

def parse_tounicode(data):
    cmap = {}
    for block in re.findall(r'beginbfchar(.*?)endbfchar', data, re.S):
        for src, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            cmap[int(src, 16)] = bytes.fromhex(dst).decode('utf-16-be')
    for block in re.findall(r'beginbfrange(.*?)endbfrange', data, re.S):
        for lo, hi, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            base = int(dst, 16)
            for i in range(int(lo, 16), int(hi, 16) + 1):
                cmap[i] = chr(base + i - int(lo, 16))
    return cmap

def parse_widths(W):
    widths = {}
    i = 0
    W = [x.get_object() if hasattr(x, 'get_object') else x for x in W]
    while i < len(W):
        first = int(W[i])
        if isinstance(W[i + 1], list):
            for k, w in enumerate(W[i + 1]):
                widths[first + k] = float(w)
            i += 2
        else:
            last, w = int(W[i + 1]), float(W[i + 2])
            for c in range(first, last + 1):
                widths[c] = w
            i += 3
    return widths

def hexcolor(rgb):
    return '#%02x%02x%02x' % tuple(round(max(0, min(1, c)) * 255) for c in rgb)

FRAME_L, FRAME_R, DIVIDER_X = 48.12, 558.26, 303.24

def close_rules(rules):
    """The reference leaves its rules short of the frame and of the central divider; close the boxes."""
    for r in rules:
        _, x0, y0, x1, y1 = r
        if abs(x1 - x0) + abs(y1 - y0) < 15: continue   # dashes of the dotted rules stay as they are
        if y0 == y1:  # horizontal
            if 48.5 < x0 <= 56: r[1] = FRAME_L
            if 540 <= x1 < FRAME_R: r[3] = FRAME_R
            if 280 <= x1 <= 296 and r[1] < DIVIDER_X: r[3] = DIVIDER_X
            if 296 <= x0 <= 308 and r[3] > DIVIDER_X: r[1] = DIVIDER_X
    # The central divider stops short of the Transport Details frame (its top edge sits at y = 214.02).
    for r in rules:
        if abs(r[1] - DIVIDER_X) < 0.5 and r[1] == r[3] and 195 <= r[4] <= 212:
            r[4] = 214.02
    # Snap rule ends onto a perpendicular rule that passes within 4 pt, so T-junctions meet.
    horizontals = [r for r in rules if r[2] == r[4] and r[3] - r[1] >= 15]
    for v in (r for r in rules if r[1] == r[3] and r[4] - r[2] >= 15):
        for h in horizontals:
            if h[1] - 1 <= v[1] <= h[3] + 1:
                if 0 < h[2] - v[4] <= 4: v[4] = h[2]
                if 0 < v[2] - h[2] <= 4: v[2] = h[2]
    # Bridge small gaps between collinear vertical rules.
    verticals = sorted((r for r in rules if r[1] == r[3] and r[4] - r[2] >= 15), key=lambda r: (round(r[1], 1), r[2]))
    for a, b in zip(verticals, verticals[1:]):
        if abs(a[1] - b[1]) < 0.5 and 0 < b[2] - a[4] <= 12:
            a[4] = b[2]

def main(path):
    reader = pypdf.PdfReader(path)
    page = reader.pages[0]
    W_PT = float(page.mediabox.width)
    fonts = {}
    for name, ref in page['/Resources']['/Font'].items():
        f = ref.get_object()
        d = f['/DescendantFonts'][0].get_object()
        fonts[name] = {
            'cmap': parse_tounicode(f['/ToUnicode'].get_object().get_data().decode('latin-1')),
            'widths': parse_widths(d['/W']),
            'dw': float(d.get('/DW', 1000)),
        }
    # F1 is the bold face of this sheet (its 'A' advance is 722/1000), F2 the regular one (666).
    bold = {'/F1': True, '/F2': False}

    cs = ContentStream(page.get_contents(), reader)
    ctm = [1, 0, 0, 1, 0, 0]
    stack = []
    fill = (0, 0, 0)
    path_pts = []   # list of subpaths, each a list of (x, y) in top-origin pt
    cur = None
    paths = []      # (color, evenodd, d)
    words = []
    font, fsize, tm = None, 0, [1, 0, 0, 1, 0, 0]

    strokes = {}  # (color, width) -> list of "M x y L x y" / rect segments

    def bbox(sub):
        xs = [p[0] for p in sub]; ys = [p[1] for p in sub]
        return min(xs), min(ys), max(xs), max(ys)

    def add_stroke(color, width, seg):
        strokes.setdefault((color, round(width, 2)), []).append(seg)

    rules = []  # (width, x0, y0, x1, y1) of straight rules, adjusted before output

    def flush(evenodd):
        """Thin filled shapes disappear in some viewers at low zoom, so rules become strokes (min width)."""
        nonlocal path_pts, cur
        if cur:
            path_pts.append(cur)
        color = hexcolor(fill)
        keep = []
        if len(path_pts) == 2 and all(len(sub) > 4 for sub in path_pts):
            # A frame drawn as outer + inner outline: replace by one stroked rectangle on its centre line.
            (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = bbox(path_pts[0]), bbox(path_pts[1])
            if (ax1 - ax0) > 10 and (ay1 - ay0) > 10:
                o, i = ((ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1)) if (ax1 - ax0) >= (bx1 - bx0) else ((bx0, by0, bx1, by1), (ax0, ay0, ax1, ay1))
                gap = ((i[0] - o[0]) + (o[2] - i[2]) + (i[1] - o[1]) + (o[3] - i[3])) / 4
                if 0 < gap <= 2.5:
                    x0, y0, x1, y1 = o[0] + gap / 2, o[1] + gap / 2, o[2] - gap / 2, o[3] - gap / 2
                    add_stroke(color, max(gap, 0.8), 'M%.2f %.2fL%.2f %.2fL%.2f %.2fL%.2f %.2fZ' % (x0, y0, x1, y0, x1, y1, x0, y1))
                    path_pts, cur = [], None
                    return
        for sub in path_pts:
            if len(sub) < 3:
                continue
            x0, y0, x1, y1 = bbox(sub)
            w, h = x1 - x0, y1 - y0
            if color == '#000000' and min(w, h) <= 1.6:
                width = max(min(w, h), 0.7)
                if w >= h:
                    cy = (y0 + y1) / 2; rules.append([width, x0, cy, x1, cy])
                else:
                    cx = (x0 + x1) / 2; rules.append([width, cx, y0, cx, y1])
            else:
                keep.append(sub)
        if keep:
            d = ''.join('M' + 'L'.join('%.2f %.2f' % p for p in sub) + 'Z' for sub in keep)
            paths.append((color, evenodd, d))
        path_pts, cur = [], None

    def pt(x, y):
        X, Y = apply(ctm, x, y)
        return (X, PAGE_H - Y)

    for args, op in cs.operations:
        op = op.decode() if isinstance(op, bytes) else op
        if op == 'q': stack.append((list(ctm), fill))
        elif op == 'Q': ctm, fill = stack.pop()
        elif op == 'cm': ctm = mul([float(x) for x in args], ctm)
        elif op == 'rg': fill = tuple(float(x) for x in args)
        elif op == 'm':
            if cur: path_pts.append(cur)
            cur = [pt(float(args[0]), float(args[1]))]
        elif op == 'l': cur.append(pt(float(args[0]), float(args[1])))
        elif op == 'h':
            if cur: path_pts.append(cur); cur = None
        elif op == 'f': flush(False)
        elif op == 'f*': flush(True)
        elif op == 'n': path_pts, cur = [], None
        elif op == 'Tf': font, fsize = fonts[args[0]], float(args[1]); fname = args[0]
        elif op == 'Tm': tm = [float(x) for x in args]
        elif op == 'TJ':
            x_adv = 0.0   # in text-space units (px at fsize)
            cur_word, word_x = '', None
            def emit():
                nonlocal cur_word, word_x
                if cur_word.strip():
                    px, py = apply(ctm, tm[4] + word_x, tm[5])
                    scale = (ctm[0] ** 2 + ctm[1] ** 2) ** 0.5
                    words.append({'x': round(px, 2), 'y': round(PAGE_H - py, 2),
                                  'size': round(fsize * scale, 2), 'bold': bold[fname], 'text': cur_word})
                cur_word, word_x = '', None
            for el in args[0]:
                if isinstance(el, str):
                    for ch in el:
                        code = ord(ch)
                        uni = font['cmap'].get(code, '?')
                        w = font['widths'].get(code, font['dw']) / 1000.0 * fsize
                        if uni == ' ':
                            emit()
                        else:
                            if word_x is None: word_x = x_adv
                            cur_word += uni
                        x_adv += w
                else:
                    # Justified lines carry no space glyph: the gap is a big negative adjustment.
                    if float(el) <= -120: emit()
                    x_adv -= float(el) / 1000.0 * fsize
            emit()

    out = {'width': round(W_PT, 2), 'height': round(PAGE_H, 2)}
    close_rules(rules)
    for width, x0, y0, x1, y1 in rules:
        add_stroke('#000000', width, 'M%.2f %.2fL%.2f %.2f' % (x0, y0, x1, y1))
    return out, paths, words, strokes

# Values and branding printed on the reference sheet, not part of the blank form.
WORD_BLOCKLIST = re.compile(r'^(X{3,}|AWBEDITOR\.COM|-|1|11)$')

if __name__ == '__main__':
    out, paths, words, strokes = main(sys.argv[1])
    words = [w for w in words if not WORD_BLOCKLIST.match(w['text'])]
    paths = [p for p in paths if p[0] != '#ffffff']
    print('// Generated by scripts/extract-dgd-form.py from a reference Shipper\'s Declaration sheet. Do not edit by hand.')
    print('export interface DgdFormPath { fill: string; evenOdd: boolean; d: string }')
    print('export interface DgdFormStroke { stroke: string; width: number; d: string }')
    print('export interface DgdFormWord { x: number; y: number; size: number; bold: boolean; text: string }')
    print('export const DGD_FORM: { width: number; height: number; paths: DgdFormPath[]; strokes: DgdFormStroke[]; words: DgdFormWord[] } = {')
    print('  width: %s, height: %s,' % (out['width'], out['height']))
    print('  paths: [')
    for color, evenodd, d in paths:
        print('    { fill: %s, evenOdd: %s, d: %s },' % (json.dumps(color), 'true' if evenodd else 'false', json.dumps(d)))
    print('  ],')
    print('  strokes: [')
    for (color, width), segs in strokes.items():
        print('    { stroke: %s, width: %s, d: %s },' % (json.dumps(color), width, json.dumps(''.join(segs))))
    print('  ],')
    print('  words: [')
    for w in words:
        print('    { x: %s, y: %s, size: %s, bold: %s, text: %s },' % (w['x'], w['y'], w['size'], 'true' if w['bold'] else 'false', json.dumps(w['text'], ensure_ascii=False)))
    print('  ],')
    print('}')
