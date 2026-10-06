import {
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
} from 'docx';

// Paleta de colores profesionales
export const COLORS = {
  primary: '1B4D3E',      // Verde DIAN / Intaglio
  primaryLight: 'E8F5E9', // Verde muy claro para fondos de callout
  secondary: '0B4F6C',    // Azul pizarra para notas técnicas
  secondaryLight: 'F0F9FF',
  warning: 'C2410C',      // Naranja quemado para advertencias fiscales
  warningLight: 'FFF7ED',
  textDark: '1E293B',     // Carbón para texto principal
  textMuted: '64748B',    // Gris para leyendas
  borderLight: 'CBD5E1',  // Borde de tablas y cajas
  bgCode: 'F8FAFC',       // Fondo de bloques de código
  codeText: '0F172A',     // Texto de código
  tableHeaderBg: '1B4D3E',// Encabezado de tabla
  tableRowAlt: 'F8FAFC',  // Fila alternada
};

export function createTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { before: 240, after: 120 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 56, // 28pt
        font: 'Segoe UI',
        color: COLORS.primary,
      }),
    ],
  });
}

export function createSubtitle(text) {
  return new Paragraph({
    spacing: { before: 60, after: 360 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text,
        size: 28, // 14pt
        font: 'Segoe UI',
        color: COLORS.textMuted,
        italics: true,
      }),
    ],
  });
}

export function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36, // 18pt
        font: 'Segoe UI',
        color: COLORS.primary,
      }),
    ],
  });
}

export function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt
        font: 'Segoe UI',
        color: COLORS.secondary,
      }),
    ],
  });
}

export function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
        font: 'Segoe UI',
        color: COLORS.textDark,
      }),
    ],
  });
}

export function createParagraph(text, options = {}) {
  const { bold = false, italics = false, color = COLORS.textDark, spacingAfter = 140 } = options;
  return new Paragraph({
    spacing: { after: spacingAfter, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        bold,
        italics,
        size: 22, // 11pt
        font: 'Segoe UI',
        color,
      }),
    ],
  });
}

export function createRichParagraph(runs, options = {}) {
  const { spacingAfter = 140 } = options;
  return new Paragraph({
    spacing: { after: spacingAfter, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    children: runs.map((r) =>
      typeof r === 'string'
        ? new TextRun({ text: r, size: 22, font: 'Segoe UI', color: COLORS.textDark })
        : new TextRun({
            text: r.text,
            bold: r.bold ?? false,
            italics: r.italics ?? false,
            color: r.color ?? (r.code ? 'B91C1C' : COLORS.textDark),
            font: r.code ? 'Consolas' : 'Segoe UI',
            size: r.code ? 20 : 22,
          })
    ),
  });
}

export function createBullet(text, boldPrefix = '', options = {}) {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 22,
        font: 'Segoe UI',
        color: COLORS.primary,
      })
    );
  }
  children.push(
    new TextRun({
      text,
      size: 22,
      font: 'Segoe UI',
      color: COLORS.textDark,
    })
  );

  return new Paragraph({
    bullet: { level: options.level ?? 0 },
    spacing: { after: 100, line: 260 },
    children,
  });
}

export function createCallout(title, message, type = 'NOTE') {
  let borderColor = COLORS.primary;
  let bgColor = COLORS.primaryLight;
  let titlePrefix = '📌 NOTA TÉCNICA: ';

  if (type === 'FISCAL') {
    borderColor = COLORS.warning;
    bgColor = COLORS.warningLight;
    titlePrefix = '⚖️ MANDATO FISCAL DIAN: ';
  } else if (type === 'IMPORTANT') {
    borderColor = COLORS.secondary;
    bgColor = COLORS.secondaryLight;
    titlePrefix = '⚡ DECISIÓN DE ARQUITECTURA: ';
  }

  const border = {
    style: BorderStyle.SINGLE,
    size: 24,
    color: borderColor,
  };
  const emptyBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: border,
      top: emptyBorder,
      right: emptyBorder,
      bottom: emptyBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 200, right: 140 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: titlePrefix + title,
                    bold: true,
                    size: 22,
                    font: 'Segoe UI',
                    color: borderColor,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: message,
                    size: 20,
                    font: 'Segoe UI',
                    color: COLORS.textDark,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function createCodeBlock(code, language = 'JavaScript') {
  const lines = code.trim().split('\n');
  const border = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: COLORS.borderLight,
  };

  const paragraphs = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `[ Código: ${language} ]`,
          bold: true,
          size: 16,
          font: 'Consolas',
          color: COLORS.textMuted,
        }),
      ],
    }),
  ];

  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 20, line: 220 },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 19, // 9.5pt
            color: COLORS.codeText,
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: border,
      top: border,
      right: border,
      bottom: border,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: COLORS.bgCode, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

export function createTable(headers, rowsData) {
  const border = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: COLORS.borderLight,
  };

  const tableRows = [];

  // Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            shading: { fill: COLORS.tableHeaderBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    size: 20,
                    font: 'Segoe UI',
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          })
      ),
    })
  );

  // Body rows
  rowsData.forEach((row, index) => {
    const isAlt = index % 2 === 1;
    tableRows.push(
      new TableRow({
        children: row.map(
          (cellText) =>
            new TableCell({
              shading: {
                fill: isAlt ? COLORS.tableRowAlt : 'FFFFFF',
                type: ShadingType.CLEAR,
              },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(cellText),
                      size: 20,
                      font: 'Segoe UI',
                      color: COLORS.textDark,
                    }),
                  ],
                }),
              ],
            })
        ),
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: border,
      top: border,
      right: border,
      bottom: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: tableRows,
  });
}

export function pageBreak() {
  return new Paragraph({
    children: [new PageBreak()],
  });
}
