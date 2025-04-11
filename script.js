document.addEventListener('DOMContentLoaded', () => {
    const plateInput = document.getElementById('plateInput');
    const generateButton = document.getElementById('generateButton');
    const plateFormatSelect = document.getElementById('plateFormat');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    let plateDesign;
    let font;

    generateButton.addEventListener('click', () => {
        const selectedFormat = plateFormatSelect.value;
        fetchPlateDesign(selectedFormat);
    });

    function fetchPlateDesign(format) {
        fetch(format)
            .then(response => response.json())
            .then(data => {
                // Check for AlUla or Diriyah format based on the JSON structure
                if (data && data.data && data.data.format) {
                    if (data.data.format['52-11-design2']) {
                        plateDesign = data.data.format['52-11-design2'];
                        plateDesign.formatKey = '52-11-design2';
                        console.log('Black palm loaded');
                        return fetch('platefont_eu.json');
                    } else if (data.data.format['52-11-design4']) {
                        plateDesign = data.data.format['52-11-design4'];
                        plateDesign.formatKey = '52-11-design4';
                        console.log('Ola loaded');
                        return fetch('platefont_eu.json');
                    } else {
                        throw new Error('Invalid plate design format selected.');
                    }
                } else {
                    console.error('Unexpected JSON structure:', data);
                    throw new Error('Invalid plate design format');
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data && data.chars && data.chars.char && Array.isArray(data.chars.char)) {
                    font = data;
                    createCharMap(font);
                    console.log('Font loaded:', font);
                    const inputText = plateInput.value.toUpperCase();
                    if (plateDesign && font) {
                        init('diffuse', inputText, plateDesign);
                    }
                } else {
                    console.error('Character layout data is missing or incorrectly formatted:', data);
                }
            })
            .catch(error => console.error('Error loading data:', error));
    }

    function createCharMap(font) {
        font.charMap = {};
        if (font.chars && font.chars.char && Array.isArray(font.chars.char)) {
            font.chars.char.forEach((charData) => {
                if (charData && typeof charData.id !== 'undefined') {
                    Object.keys(charData).forEach(key => {
                        charData[key] = parseInt(charData[key], 10);
                    });
                    font.charMap[charData.id] = charData;
                } else {
                    console.warn('Character data missing properties:', charData);
                }
            });
            console.log('Mapped Characters:', font.charMap);
        } else {
            console.error('Font character data is missing or not formatted as expected:', font.chars);
        }
    }

    function goDraw(text, font, tintSprites, bumpSprites, scale, ctx, canvas, x, y) {
        // Drawing code for fonts with bump effect remains unchanged
        // Ensure canvas and context are valid
        if (!(canvas instanceof HTMLCanvasElement)) {
            console.error('The provided canvas is not a valid <canvas> element:', canvas);
            return;
        }

        if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
            ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get 2D context.');
                return;
            }
        }

        if (!font || !font.common || !font.common.lineHeight) {
            console.error('Font data is missing or improperly structured:', font);
            return;
        }

        const lineHeight = parseInt(font.common.lineHeight);
        const lineBase = parseInt(font.common.base);

        let textWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (!font.charMap[charCode]) {
                console.warn(`Character ${text[i]} with code ${charCode} not found in font map.`);
                continue;
            }
            const glyph = font.charMap[charCode];
            textWidth += glyph.xadvance * scale;
        }

        x = canvas.width * x - textWidth * 0.5; // Charachters X axis
        y = canvas.height * y - lineHeight * 0.5; // Charachters Y axis

        // Adjusted bump map for font effect
        const adjustedFontBumpCanvas = document.createElement('canvas');
        adjustedFontBumpCanvas.width = bumpSprites.width;
        adjustedFontBumpCanvas.height = bumpSprites.height;
        const adjustedFontBumpCtx = adjustedFontBumpCanvas.getContext('2d');

        adjustedFontBumpCtx.drawImage(bumpSprites, 0, 0);

        const fontImageData = adjustedFontBumpCtx.getImageData(0, 0, adjustedFontBumpCanvas.width, adjustedFontBumpCanvas.height);
        const fontData = fontImageData.data;
        for (let i = 0; i < fontData.length; i += 4) {
            const gray = 0.3 * fontData[i] + 0.59 * fontData[i + 1] + 0.11 * fontData[i + 2];
            const adjustedGray = Math.min(gray + 80, 255);
            fontData[i] = fontData[i + 1] = fontData[i + 2] = adjustedGray;
        }
        adjustedFontBumpCtx.putImageData(fontImageData, 0, 0);

        // Draw each character with bump effect
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const glyph = font.charMap[charCode];

            if (!glyph) {
                console.warn(`Character "${text[i]}" not found in the font map.`);
                continue;
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(
                tintSprites,
                glyph.x, glyph.y, glyph.width, glyph.height,
                x + glyph.xoffset * scale, y - (lineHeight - lineBase) - glyph.yoffset * scale,
                glyph.width * scale, glyph.height * scale
            );

            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.9;
            ctx.drawImage(
                adjustedFontBumpCanvas,
                glyph.x, glyph.y, glyph.width, glyph.height,
                x + glyph.xoffset * scale, y - (lineHeight - lineBase) - glyph.yoffset * scale,
                glyph.width * scale, glyph.height * scale 
            );

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            x += glyph.xadvance * scale;
        }
    }

    function init(mode, text, design) {
        if (!design || !design.size || !design.text) {
            console.error('Invalid or missing design data:', design);
            return;
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions according to the design
        canvas.width = design.size.x;
        canvas.height = design.size.y;

        let plateImage = new Image();
        let sprites = new Image();
        let bumpSprites = new Image();

        // Load plate image based on selected plate format

        if (design.formatKey === '52-11-design2') {
            plateImage.src = 'black.png'; // Black palm
        } else if (design.formatKey === '52-11-design4') {
            plateImage.src = 'ola.png'; // Ola 
        } else {
            console.error('Unknown plate format:', design.formatKey);
            return; // Stop if an unknown format is detected
        }

        // Load sprite and bump maps
        sprites.src = design[mode].spriteImg;
        bumpSprites.src = design.bump.spriteImg;

        let imagesLoaded = 0;

        // Render once all images are loaded
        const checkRender = () => {
            if (imagesLoaded < 3) return;

            ctx.fillStyle = design[mode].fillStyle;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(plateImage, 0, 0, plateImage.naturalWidth, plateImage.naturalHeight, 0, 0, canvas.width, canvas.height);

            let tintSprites = document.createElement('canvas');
            tintSprites.width = sprites.width;
            tintSprites.height = sprites.height;
            const tintCtx = tintSprites.getContext('2d');
            
            tintCtx.fillStyle = design.text.color || 'black';
            tintCtx.fillRect(0, 0, tintSprites.width, tintSprites.height);
            tintCtx.globalCompositeOperation = 'multiply';
            tintCtx.drawImage(sprites, 0, 0);
            tintCtx.globalCompositeOperation = 'destination-in';
            tintCtx.drawImage(sprites, 0, 0);

            const numbers = text.replace(/[^0-9]/g, '');
            const letters = text.replace(/[^A-Z]/g, '');

            if (numbers) {
                goDraw(numbers, font, tintSprites, bumpSprites, design.text.scale, ctx, canvas, design.text.x, design.text.y);
            }
            if (letters) {
                goDraw(letters, font, tintSprites, bumpSprites, design.text.scale2, ctx, canvas, design.text.x2, design.text.y2);
            }
        };

        plateImage.onload = () => {
            imagesLoaded++;
            checkRender();
        };

        sprites.onload = () => {
            imagesLoaded++;
            checkRender();
        };

        bumpSprites.onload = () => {
            imagesLoaded++;
            checkRender();
        };

        plateImage.onerror = () => console.error('Failed to load plate image.');
        sprites.onerror = () => console.error('Failed to load sprite image.');
        bumpSprites.onerror = () => console.error('Failed to load bump image.');
        
    }
});