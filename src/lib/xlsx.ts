/**
 * A spreadsheet writer, small enough to keep in the app.
 *
 * The shop's tablets are offline half the time, so the report has to be built
 * on the device. A real .xlsx is a zip of XML parts — stored, never deflated,
 * which costs a few kilobytes and saves pulling a compression library in. The
 * styles below exist for one reason: numbers that line up under each other and
 * headers that stay put while the sheet scrolls.
 */

export type CellStyle = 'text' | 'money' | 'count' | 'bold' | 'title' | 'header'

export interface Cell {
  value: string | number
  style?: CellStyle
}

export interface Column {
  header: string
  /** Width in characters, as Excel counts them. */
  width: number
}

export interface Sheet {
  /** Tab name. Excel refuses more than 31 characters and a few punctuation marks. */
  name: string
  /** Named columns get a frozen header row of their own. */
  columns?: Column[]
  /** Widths alone, for a sheet that lays its own headings out in the rows. */
  widths?: number[]
  rows: (Cell | string | number)[][]
}

/** Order matters: the index into this list is what a cell's `s` attribute is. */
const STYLES: CellStyle[] = ['text', 'money', 'count', 'bold', 'title', 'header']

const MONEY_FORMAT = 164

export function buildWorkbook(sheets: Sheet[]): Blob {
  const parts: ZipEntry[] = [
    file('[Content_Types].xml', contentTypes(sheets.length)),
    file('_rels/.rels', RELS),
    file('xl/workbook.xml', workbook(sheets)),
    file('xl/_rels/workbook.xml.rels', workbookRels(sheets.length)),
    file('xl/styles.xml', STYLES_XML),
    ...sheets.map((sheet, i) => file(`xl/worksheets/sheet${i + 1}.xml`, worksheet(sheet))),
  ]
  return zip(parts)
}

/** Hands the finished workbook to the browser as a download. */
export function downloadWorkbook(sheets: Sheet[], filename: string) {
  const url = URL.createObjectURL(buildWorkbook(sheets))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari needs the URL to outlive the click.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/* ---------- worksheet ---------- */

function worksheet(sheet: Sheet): string {
  const columns = sheet.columns ?? []
  const head: (Cell | string | number)[][] = columns.length
    ? [columns.map((column) => ({ value: column.header, style: 'header' as CellStyle }))]
    : []
  const rows = [...head, ...sheet.rows]

  const widths = columns.length ? columns.map((column) => column.width) : (sheet.widths ?? [])
  const cols = widths.length
    ? `<cols>${widths
        .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
        .join('')}</cols>`
    : ''

  // The header row stays on screen; a report is read by scrolling down it.
  const pane = columns.length
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : ''

  const body = rows
    .map((row, r) => {
      const cells = row
        .map((raw, c) => cell(raw, columnName(c) + (r + 1)))
        .filter(Boolean)
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData></worksheet>`
}

function cell(raw: Cell | string | number, ref: string): string {
  const { value, style } = typeof raw === 'object' ? raw : { value: raw, style: undefined }
  if (value === '') return ''
  const s = STYLES.indexOf(style ?? (typeof value === 'number' ? 'count' : 'text'))
  const index = s < 0 ? 0 : s
  if (typeof value === 'number') {
    return `<c r="${ref}" s="${index}"><v>${value}</v></c>`
  }
  return `<c r="${ref}" s="${index}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

/** 0 -> A, 25 -> Z, 26 -> AA. */
function columnName(index: number): string {
  let name = ''
  let n = index
  do {
    name = String.fromCharCode(65 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return name
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are not legal in XML 1.0 and Excel rejects the file.
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

/* ---------- workbook parts ---------- */

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

function contentTypes(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}</Types>`
}

function workbook(sheets: Sheet[]): string {
  const tabs = sheets
    .map(
      (sheet, i) =>
        `<sheet name="${escapeXml(sheetName(sheet.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${tabs}</sheets></workbook>`
}

/** Excel's own limits on a tab name, applied quietly rather than failing. */
function sheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet'
}

function workbookRels(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets}<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
}

/* Money right-aligned with thousands separators, headers bold on a tinted band,
   everything else plain — the same restraint the printed sheet keeps. */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="${MONEY_FORMAT}" formatCode="#,##0"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0E7D6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFBFB6A6"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="${MONEY_FORMAT}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

/* ---------- zip ---------- */

interface ZipEntry {
  name: Uint8Array
  data: Uint8Array
}

function file(name: string, text: string): ZipEntry {
  const encoder = new TextEncoder()
  return { name: encoder.encode(name), data: encoder.encode(text) }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(entries: ZipEntry[]): Blob {
  const locals: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const crc = crc32(entry.data)
    const size = entry.data.length

    const header = new Uint8Array(30)
    const head = new DataView(header.buffer)
    head.setUint32(0, 0x04034b50, true)
    head.setUint16(4, 20, true) // version needed
    head.setUint16(6, 0x0800, true) // names are UTF-8
    head.setUint16(8, 0, true) // stored, not deflated
    head.setUint32(14, crc, true)
    head.setUint32(18, size, true)
    head.setUint32(22, size, true)
    head.setUint16(26, entry.name.length, true)
    locals.push(header, entry.name, entry.data)

    const record = new Uint8Array(46)
    const dir = new DataView(record.buffer)
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true) // version made by
    dir.setUint16(6, 20, true) // version needed
    dir.setUint16(8, 0x0800, true)
    dir.setUint16(10, 0, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, size, true)
    dir.setUint32(24, size, true)
    dir.setUint16(28, entry.name.length, true)
    dir.setUint32(42, offset, true)
    central.push(record, entry.name)

    offset += header.length + entry.name.length + size
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const tail = new DataView(end.buffer)
  tail.setUint32(0, 0x06054b50, true)
  tail.setUint16(8, entries.length, true)
  tail.setUint16(10, entries.length, true)
  tail.setUint32(12, centralSize, true)
  tail.setUint32(16, offset, true)

  const parts = [...locals, ...central, end]
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }

  return new Blob([out.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
