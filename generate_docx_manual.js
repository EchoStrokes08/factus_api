import fs from 'node:fs';
import path from 'node:path';
import { Document, Packer } from 'docx';
import { getChapter1 } from './manual_generator/ch1_cover_and_fiscal.js';
import { getChapter2 } from './manual_generator/ch2_architecture.js';
import { getChapter3 } from './manual_generator/ch3_network_and_auth.js';
import { getChapter4 } from './manual_generator/ch4_business_logic.js';
import { getChapter5 } from './manual_generator/ch5_agent_ai.js';
import { getChapter6 } from './manual_generator/ch6_frontend_voice.js';
import { getChapter7 } from './manual_generator/ch7_edge_cases_and_guide.js';

async function generateMasterManual() {
  console.log('Compilando capítulos del Manual Maestro...');

  const allElements = [
    ...getChapter1(),
    ...getChapter2(),
    ...getChapter3(),
    ...getChapter4(),
    ...getChapter5(),
    ...getChapter6(),
    ...getChapter7(),
  ];

  console.log(`Total de elementos de documento a renderizar: ${allElements.length}`);

  const doc = new Document({
    title: 'Manual Maestro de Arquitectura, Código y Dominio Fiscal - Factus Voz',
    description: 'Guía técnica integral y exhaustiva para comprender cada línea de código y decisión fiscal',
    creator: 'Antigravity AI - Advanced Agentic Coding',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pulgada (1440 dxa/twips)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: allElements,
      },
    ],
  });

  console.log('Generando archivo binario Word (.docx)...');
  const buffer = await Packer.toBuffer(doc);
  
  const outputPath = path.resolve('MANUAL_MAESTRO_FACTUS_VOZ.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ ¡Documento Word generado exitosamente!`);
  console.log(`Ubicación: ${outputPath}`);
  console.log(`Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`);
}

generateMasterManual().catch((err) => {
  console.error('❌ Error generando el documento Word:', err);
  process.exit(1);
});
