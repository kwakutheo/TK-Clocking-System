const pdfmake = require('pdfmake');
const fs = require('fs');

async function test() {
  try {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    pdfmake.setFonts(fonts);
    
    const docDefinition = {
      defaultStyle: { font: 'Helvetica' },
      content: ['Hello PDF from new API']
    };
    
    const pdfDoc = pdfmake.createPdf(docDefinition);
    const buffer = await pdfDoc.getBuffer();
    
    fs.writeFileSync('test2.pdf', buffer);
    console.log('PDF created successfully (test2.pdf)');
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
