
(function() {
  let plateDesign, font;

  function createCharMap(font) {
    font.charMap = {};
    font.chars.char.forEach(charData => {
      Object.keys(charData).forEach(key => {
        charData[key] = parseInt(charData[key], 10);
      });
      font.charMap[charData.id] = charData;
    });
  }

  function goDraw(text, font, tintSprites, bumpSprites, scale, ctx, canvas, x, y) {
    const lineHeight = parseInt(font.common.lineHeight);
    const lineBase = parseInt(font.common.base);
    let textWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = font.charMap[text.charCodeAt(i)];
      if (glyph) textWidth += glyph.xadvance * scale;
    }
    x = canvas.width * x - textWidth * 0.5;
    y = canvas.height * y - lineHeight * 0.5;

    for (let i = 0; i < text.length; i++) {
      const glyph = font.charMap[text.charCodeAt(i)];
      if (!glyph) continue;

      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tintSprites, glyph.x, glyph.y, glyph.width, glyph.height,
        x + glyph.xoffset * scale, y - (lineHeight - lineBase) - glyph.yoffset * scale,
        glyph.width * scale, glyph.height * scale);

      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(bumpSprites, glyph.x, glyph.y, glyph.width, glyph.height,
        x + glyph.xoffset * scale, y - (lineHeight - lineBase) - glyph.yoffset * scale,
        glyph.width * scale, glyph.height * scale);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      x += glyph.xadvance * scale;
    }
  }

  function init(mode, text, design) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = design.size.x;
    canvas.height = design.size.y;

    const plateImage = new Image();
    const sprites = new Image();
    const bumpSprites = new Image();

    plateImage.src = design.formatKey === '52-11-design2' ? 'black.png' : 'ola.png';
    sprites.src = design[mode].spriteImg;
    bumpSprites.src = design.bump.spriteImg;

    let loaded = 0;
    const check = () => {
      if (++loaded < 3) return;
      ctx.fillStyle = design[mode].fillStyle;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(plateImage, 0, 0, canvas.width, canvas.height);

      const tintCanvas = document.createElement('canvas');
      tintCanvas.width = sprites.width;
      tintCanvas.height = sprites.height;
      const tintCtx = tintCanvas.getContext('2d');

      tintCtx.fillStyle = design.text.color || 'black';
      tintCtx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
      tintCtx.globalCompositeOperation = 'multiply';
      tintCtx.drawImage(sprites, 0, 0);
      tintCtx.globalCompositeOperation = 'destination-in';
      tintCtx.drawImage(sprites, 0, 0);

      const numbers = text.replace(/[^0-9]/g, '');
      const letters = text.replace(/[^A-Z]/g, '');

      if (numbers) goDraw(numbers, font, tintCanvas, bumpSprites, design.text.scale, ctx, canvas, design.text.x, design.text.y);
      if (letters) goDraw(letters, font, tintCanvas, bumpSprites, design.text.scale2, ctx, canvas, design.text.x2, design.text.y2);
    };

    plateImage.onload = check;
    sprites.onload = check;
    bumpSprites.onload = check;
  }

  // تعريف الدالة لتكون مرئية عالمياً
  window.generatePlate = function({ format, text }) {
    fetch(format).then(r => r.json()).then(data => {
      const fKey = data.data.format['52-11-design2'] ? '52-11-design2' : '52-11-design4';
      const design = data.data.format[fKey];
      design.formatKey = fKey;
      plateDesign = design;
      return fetch('platefont_eu.json');
    }).then(r => r.json()).then(f => {
      font = f;
      createCharMap(font);
      init('diffuse', text, plateDesign);
    }).catch(err => {
      console.error('Error generating plate:', err);
      alert('فشل في تحميل بيانات اللوحة أو الخط. تأكد من توفر الملفات.');
    });
  };
})();
