document.addEventListener('DOMContentLoaded', (event) => {
    // --- Setup ---
    const garden = document.getElementById('garden');
    const messageBox = document.getElementById('message-box');
    const canvas = document.getElementById('flower-canvas');
    const ctx = canvas.getContext('2d');

    let windEffect = 0;
    let targetWindEffect = 0;
    let isDrawing = false;
    let isVortexActive = false;
    let vortexEffectElement = null;
    let themedFlowerType = null;
    let lastFlowerTime = 0;
    const isMobile = window.innerWidth < 768;
    const flowerGenerationDelay = 100;
    const flowerMaxAge = isMobile ? 45000 : 60000;

    // --- Object Pools for Performance ---
    let flowers = [];
    let dustParticles = [];
    let petalParticles = [];

    const characters = [
        {
            name: 'snoopy',
            type: 'main',
            flowerType: 3,
            src: 'snoopy.png',
            messages: [
                "¡Para ti, con cariño! 🌻", "Las flores traen felicidad. 😊", "Te quiero mucho!!!!!!!. ✨",
                "¡Que tu día florezca como estas flores! 💛", "¡Gracias por estar :) ! 💛", "¡Eres increíble! 🌟",
                "¡Sigue brillando! 🌞", "¡Eres una flor en este jardín! 🌸", "¡Tu sonrisa ilumina el día! 😄",
                "¡Eres especial! 🌟", "¡Nunca dejes de soñar! 🌈", "¡Sigue haciendote mas fuerte! 🌱",
                "¡Eres maravillosa! 🌟", "¡Eres un rayo de sol! ☀️", "¡Eres una inspiración! 🌟",
                "¡Gracias por escucharme! 💖", "¡Eres mi persona favorita! 💕", "¡Disfruto mucho tu compañía! 😊",
            ]
        },
        {
            name: 'luffy',
            type: 'guest',
            flowerType: 4,
            src: 'luffy.png',
            messages: [
                "¡Voy a ser el Rey de los Piratas!", "¡La carne es lo mejor!", "¡Esto es muy divertido!",
                "¡Tengo a los mejores nakamas!", "¡Gomu Gomu no...!",
            ]
        },
        {
            name: 'deku',
            type: 'guest',
            flowerType: 5,
            src: 'deku.png',
            messages: [
                "¡Plus Ultra!", "¡Tengo que esforzarme más!", "¡Un héroe siempre encuentra la manera!",
                "¡One For All! ¡100%!", "¡Puedo ser un héroe!",
            ]
        },
        {
            name: 'abuela',
            type: 'guest',
            flowerType: 6,
            src: 'abuela.png',
            messages: [
                "¡Okarun, Momo, a jugar!",
                "¡Momo, no dejes a Okarun!",
                "¡Okarun, eres lento!",
                "¡Momo, pelea!",
                "¡Dónde están Okarun y Momo!"
            ]
        }
    ];
    let activeCharacters = {};
    const snoopyInfo = characters.find(c => c.name === 'snoopy');

    // --- Canvas & Window Setup ---
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    setTimeout(() => {
        if (messageBox) messageBox.style.display = 'none';
    }, 10000);

    // --- Particle Creation (Canvas) ---
    function createDustParticle() {
        if (dustParticles.length > (isMobile ? 30 : 50)) return; // Limit max particles
        const randomFactor = Math.random();
        dustParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 1 + randomFactor * 3,
            opacity: 1,
            life: 1, // 1 = full life, 0 = dead
            duration: 5 + (1 - randomFactor) * 10, // 5s to 15s
            speedX: (Math.random() - 0.5) * 20,
            speedY: (Math.random() - 0.5) * 20,
        });
    }

    function createPetalParticle() {
        if (petalParticles.length > (isMobile ? 15 : 30)) return; // Limit max particles
        const randomFactor = Math.random();
        const hue = 330 + Math.random() * 60;
        petalParticles.push({
            x: Math.random() * canvas.width,
            y: -20,
            size: 5 + randomFactor * 8,
            opacity: 1,
            life: 1,
            duration: 5 + (1 - randomFactor) * 10,
            speedX: (Math.random() - 0.5) * 40,
            speedY: 20 + Math.random() * 20,
            color: `hsla(${hue}, ${70 + Math.random() * 30}%, ${65 + Math.random() * 15}%, 0.6)`,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
        });
    }

    // --- Flower Creation ---
    function createFlower(x, y, themeType = null) {
        const randomScale = 0.7 + Math.random() * 0.6;
        const isSpecialColor = Math.random() < 0.15;
        let hue, saturation, lightness;

        if (!isSpecialColor) {
            hue = 40 + Math.random() * 20;
            saturation = 80 + Math.random() * 20;
            lightness = 50 + Math.random() * 20;
        } else {
            const specialColors = [
                { hue: 350, saturation: 80, lightness: 65 }, { hue: 20, saturation: 90, lightness: 60 },
                { hue: 250, saturation: 70, lightness: 70 },
            ];
            const selectedColor = specialColors[Math.floor(Math.random() * specialColors.length)];
            hue = selectedColor.hue; saturation = selectedColor.saturation; lightness = selectedColor.lightness;
        }

        const flowerType = (themeType !== null && Math.random() < 0.4) ? themeType : Math.floor(Math.random() * 3);
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const lighterColor = `hsl(${hue}, ${saturation}%, ${Math.min(100, lightness + 20)}%)`;
        const darkerColor = `hsl(${hue}, ${saturation}%, ${Math.max(0, lightness - 20)}%)`;

        // --- Off-screen canvas for pre-rendering ---
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d');
        const canvasSize = 100; // A bit of padding
        offscreenCanvas.width = canvasSize;
        offscreenCanvas.height = canvasSize;
        
        // Translate to center for drawing
        offscreenCtx.translate(canvasSize / 2, canvasSize / 2);

        // --- Draw static parts to off-screen canvas ---
        // Stem and leaves
        offscreenCtx.strokeStyle = '#33691E';
        offscreenCtx.lineWidth = 3;
        offscreenCtx.beginPath(); offscreenCtx.moveTo(0, 0); offscreenCtx.lineTo(0, 40); offscreenCtx.stroke();
        offscreenCtx.fillStyle = '#4CAF50';
        offscreenCtx.beginPath(); offscreenCtx.ellipse(5, 20, 12, 6, -Math.PI / 5, 0, 2 * Math.PI); offscreenCtx.fill();
        offscreenCtx.beginPath(); offscreenCtx.ellipse(-5, 25, 12, 6, Math.PI / 5, 0, 2 * Math.PI); offscreenCtx.fill();
        
        const gradient = offscreenCtx.createRadialGradient(0, 0, 1, 0, 0, 25);
        gradient.addColorStop(0, lighterColor);
        gradient.addColorStop(1, color);
        offscreenCtx.fillStyle = gradient;
        offscreenCtx.strokeStyle = darkerColor;
        offscreenCtx.lineWidth = 1;

        // Petals based on type
        switch (flowerType) {
            case 0: // Original flower
            default:
                const petalCount = 8;
                for (let i = 0; i < petalCount; i++) {
                    const angle = (i / petalCount) * 2 * Math.PI;
                    offscreenCtx.save(); offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath(); offscreenCtx.moveTo(0, 0); offscreenCtx.quadraticCurveTo(15, 15, 0, 30); offscreenCtx.quadraticCurveTo(-15, 15, 0, 0);
                    offscreenCtx.fill(); offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                break;
            case 1: // Daisy-like flower
                const daisyPetals = 12;
                for (let i = 0; i < daisyPetals; i++) {
                    const angle = (i / daisyPetals) * 2 * Math.PI;
                    offscreenCtx.save(); offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath(); offscreenCtx.ellipse(0, 18, 4, 15, 0, 0, 2 * Math.PI);
                    offscreenCtx.fill(); offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                break;
            case 2: // Tulip-like flower
                const tulipPetals = 3;
                for (let i = 0; i < tulipPetals; i++) {
                    const angle = (i / tulipPetals) * 2 * Math.PI;
                    offscreenCtx.save(); offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath(); offscreenCtx.moveTo(0, -10); offscreenCtx.quadraticCurveTo(25, 10, 20, 30); offscreenCtx.lineTo(-20, 30); offscreenCtx.quadraticCurveTo(-25, 10, 0, -10); offscreenCtx.closePath();
                    offscreenCtx.fill(); offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                break;
            case 3: // Snoopy Flower
                offscreenCtx.fillStyle = 'white'; offscreenCtx.strokeStyle = '#E0E0E0';
                const snoopyPetals = 12;
                for (let i = 0; i < snoopyPetals; i++) {
                    const angle = (i / snoopyPetals) * 2 * Math.PI;
                    offscreenCtx.save(); offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath(); offscreenCtx.ellipse(0, 18, 6, 15, 0, 0, 2 * Math.PI);
                    offscreenCtx.fill(); offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                offscreenCtx.beginPath(); offscreenCtx.arc(0, 0, 10, 0, 2 * Math.PI); offscreenCtx.fillStyle = 'black'; offscreenCtx.fill();
                break;
            case 4: // Luffy Flower
                offscreenCtx.fillStyle = '#FFD700'; offscreenCtx.strokeStyle = '#DAA520'; offscreenCtx.lineWidth = 2;
                offscreenCtx.beginPath(); offscreenCtx.ellipse(0, 5, 35, 15, 0, 0, 2 * Math.PI); offscreenCtx.fill(); offscreenCtx.stroke();
                offscreenCtx.fillStyle = '#FBC02D';
                offscreenCtx.beginPath(); offscreenCtx.moveTo(-20, -5); offscreenCtx.quadraticCurveTo(0, -30, 20, -5); offscreenCtx.closePath(); offscreenCtx.fill(); offscreenCtx.stroke();
                offscreenCtx.fillStyle = '#FF1744'; offscreenCtx.strokeStyle = '#C4001D'; offscreenCtx.lineWidth = 1.5;
                offscreenCtx.beginPath(); offscreenCtx.rect(-22, -8, 44, 10); offscreenCtx.fill(); offscreenCtx.stroke();
                break;
            case 5: // Deku Flower
                offscreenCtx.fillStyle = '#008000'; offscreenCtx.strokeStyle = '#006400';
                const dekuPetals = 8;
                for (let i = 0; i < dekuPetals; i++) {
                    const angle = (i / dekuPetals) * 2 * Math.PI + (Math.PI / dekuPetals);
                    offscreenCtx.save(); offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath(); offscreenCtx.moveTo(0, 0); offscreenCtx.lineTo(10, 30); offscreenCtx.lineTo(-10, 30); offscreenCtx.closePath();
                    offscreenCtx.fill(); offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                offscreenCtx.beginPath(); offscreenCtx.arc(0, 0, 8, 0, 2 * Math.PI); offscreenCtx.fillStyle = '#2F4F4F'; offscreenCtx.fill();
                break;
            case 6: // "Turbo Abuela" Flower
                // White, flowing petals representing her hair
                offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                offscreenCtx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
                offscreenCtx.lineWidth = 1;
                const abuelaPetals = 7;
                for (let i = 0; i < abuelaPetals; i++) {
                    const angle = (i / abuelaPetals) * 2 * Math.PI;
                    offscreenCtx.save();
                    offscreenCtx.rotate(angle);
                    offscreenCtx.beginPath();
                    offscreenCtx.moveTo(0, 10);
                    offscreenCtx.quadraticCurveTo(20, 25, 0, 45);
                    offscreenCtx.quadraticCurveTo(-20, 25, 0, 10);
                    offscreenCtx.fill();
                    offscreenCtx.stroke();
                    offscreenCtx.restore();
                }
                
                // Red rectangle center representing her glasses
                offscreenCtx.fillStyle = 'rgba(255, 20, 20, 1)';
                offscreenCtx.strokeStyle = 'rgba(150, 0, 0, 1)';
                offscreenCtx.lineWidth = 2;
                offscreenCtx.beginPath();
                offscreenCtx.rect(-12, -6, 24, 12);
                offscreenCtx.fill();
                offscreenCtx.stroke();
                break;
        }

        flowers.unshift({
            x, y, scale: randomScale, currentRotation: Math.random() * 360,
            creationTime: Date.now(), isBeingAbsorbed: false, isDisappearing: false, flowerType,
            offscreenCanvas, canvasSize
        });
    }
    
    function removeFlowersByType(type) {
        flowers.forEach(flower => {
            if (flower.flowerType === type) flower.isDisappearing = true;
        });
    }

    // --- Drawing Functions ---
    function drawFlower(flower, now) {
        ctx.save();
        ctx.translate(Math.round(flower.x), Math.round(flower.y));
        ctx.rotate(windEffect + flower.currentRotation * Math.PI / 180);

        // Add a growing animation for new flowers
        const age = now - flower.creationTime;
        const growthDuration = 500; // 0.5 seconds
        let growthScale = 1;
        if (age < growthDuration) {
            growthScale = age / growthDuration;
        }

        ctx.scale(flower.scale * growthScale, flower.scale * growthScale);

        // Apply dynamic shadow for special flowers before drawing
        if (!isMobile) {
            if (flower.flowerType >= 3) {
                ctx.shadowColor = 'rgba(255, 223, 0, 0.75)';
                ctx.shadowBlur = Math.sin(now / 400) * 5 + 10;
            } else {
                // Add a subtle glow to normal flowers
                ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
                ctx.shadowBlur = Math.sin(now / 500 + flower.creationTime / 1000) * 3 + 6;
            }
        }

        // Draw the pre-rendered flower
        ctx.drawImage(flower.offscreenCanvas, -flower.canvasSize / 2, -flower.canvasSize / 2);

        // Reset shadow for other elements
        ctx.shadowColor = 'transparent';

        // Draw dynamic pulsing center for normal flowers
        if (flower.flowerType < 3) {
            const pulse = Math.sin((now - flower.creationTime) / 400) * 5 + 40;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, 2 * Math.PI);
            ctx.fillStyle = `hsla(24, 55%, ${pulse}%, 0.9)`;
            ctx.fill();
            ctx.strokeStyle = "rgba(92, 51, 23, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawParticles(deltaTime) {
        // Dust
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < dustParticles.length; ) {
            const p = dustParticles[i];
            p.life -= deltaTime / p.duration;
            if (p.life <= 0) {
                dustParticles[i] = dustParticles[dustParticles.length - 1];
                dustParticles.pop();
            } else {
                // Make dust particles react to wind
                p.x += (p.speedX + windEffect * 20) * deltaTime; // Wind has a smaller effect on dust
                p.y += p.speedY * deltaTime;
                p.opacity = p.life > 0.5 ? (1 - p.life) * 2 : p.life * 2;
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.arc(Math.round(p.x), Math.round(p.y), p.size, 0, 2 * Math.PI);
                ctx.fill();
                i++;
            }
        }

        // Petals
        for (let i = 0; i < petalParticles.length; ) {
            const p = petalParticles[i];
            p.life -= deltaTime / p.duration;
            if (p.life <= 0 || p.y > canvas.height + p.size) {
                petalParticles[i] = petalParticles[petalParticles.length - 1];
                petalParticles.pop();
            } else {
                p.x += (p.speedX + windEffect * 100) * deltaTime;
                p.y += p.speedY * deltaTime;
                p.rotation += p.rotationSpeed * deltaTime;
                p.opacity = p.life > 0.5 ? (1 - p.life) * 2 : p.life * 2;
                
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.save();
                ctx.translate(Math.round(p.x), Math.round(p.y));
                ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
                i++;
            }
        }
        ctx.globalAlpha = 1;
    }

    // --- Main Animation Loop ---
    let lastTime = 0;
    function animate(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000 || 0;
        lastTime = currentTime;
        const now = Date.now(); // Get time once per frame

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        windEffect += (targetWindEffect - windEffect) * 0.05;

        // --- Update and Draw Particles ---
        drawParticles(deltaTime);

        // --- Update and Draw Flowers ---
        const activeCharacterElements = Object.values(activeCharacters).filter(el => el);
        const vortexPos = isVortexActive && vortexEffectElement ? {
            x: parseFloat(vortexEffectElement.style.left) + parseFloat(vortexEffectElement.style.width) / 2,
            y: parseFloat(vortexEffectElement.style.top) + parseFloat(vortexEffectElement.style.height) / 2,
            radiusSq: 150 * 150
        } : null;

        for (let i = flowers.length - 1; i >= 0; i--) {
            const flower = flowers[i];
            
            // 1. Update state (aging, disappearing)
            if (!flower.isDisappearing && (now - flower.creationTime > flowerMaxAge)) {
                flower.isDisappearing = true;
            }
            if (flower.isDisappearing) {
                flower.scale *= 0.95;
                flower.currentRotation += 10;
            }

            // 2. Check for removal
            if (flower.scale < 0.05 || flower.x < -100 || flower.x > canvas.width + 100 || flower.y < -100 || flower.y > canvas.height + 100) {
                flowers.splice(i, 1);
                continue;
            }

            // 3. Handle interactions (absorption, vortex)
            flower.isBeingAbsorbed = false;
            let absorbed = false;

            // Character absorption
            for (const charElement of activeCharacterElements) {
                const rect = charElement.getBoundingClientRect();
                const charX = rect.left + rect.width / 2;
                const charY = rect.top + rect.height / 2;
                const dx = flower.x - charX;
                const dy = flower.y - charY;
                const distanceSq = dx * dx + dy * dy;
                const absorptionRadius = window.innerWidth < 768 ? 120 : 250;
                const absorptionRadiusSq = absorptionRadius * absorptionRadius;

                if (distanceSq < absorptionRadiusSq) {
                    flower.isBeingAbsorbed = true;
                    flower.x -= dx * 0.05; flower.y -= dy * 0.05;
                    flower.scale *= 0.98; flower.currentRotation += 5;
                    if (flower.scale < 0.1 || distanceSq < 100) { // 10*10
                        createSparkle(flower.x, flower.y, 5);
                        flowers.splice(i, 1);
                        absorbed = true;
                    }
                    break;
                }
            }
            if (absorbed) continue;

            // Vortex absorption
            if (vortexPos) {
                const dx = flower.x - vortexPos.x;
                const dy = flower.y - vortexPos.y;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq < vortexPos.radiusSq) {
                    flower.isBeingAbsorbed = true;
                    flower.x -= dx * 0.08; flower.y -= dy * 0.08;
                    flower.scale *= 0.98; flower.currentRotation += 10;
                    if (flower.scale < 0.1 || distanceSq < 100) { // 10*10
                        createSparkle(flower.x, flower.y, 5);
                        flowers.splice(i, 1);
                        continue;
                    }
                }
            }

            // 4. Update rotation and draw
            if (!flower.isBeingAbsorbed) {
                flower.currentRotation += 0.1;
            }
            drawFlower(flower, now);
        }
        
        // --- Generate new flowers ---
        if (Date.now() - lastFlowerTime > (isMobile ? 200 : 75)) {
            createFlower(Math.random() * canvas.width, Math.random() * canvas.height, themedFlowerType);
            lastFlowerTime = Date.now();
        }

        requestAnimationFrame(animate);
    }
    
    // --- DOM Element Creation (Sparkles, Messages, etc.) ---
    function createSparkle(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            const size = 5 + Math.random() * 10;
            sparkle.style.cssText = `
                width: ${size}px; height: ${size}px;
                left: ${x + (Math.random() - 0.5) * 20}px;
                top: ${y + (Math.random() - 0.5) * 20}px;
            `;
            document.body.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 500);
        }
    }

    // --- Event Handlers ---
    function handleInteraction(e, type) {
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX === undefined) return;

        if (e.shiftKey || (type === 'vortex' && isVortexActive)) {
            if (!vortexEffectElement) {
                vortexEffectElement = document.createElement('div');
                vortexEffectElement.classList.add('vortex-effect');
                garden.appendChild(vortexEffectElement);
            }
            const vortexSize = 100;
            vortexEffectElement.style.cssText = `
                width: ${vortexSize}px; height: ${vortexSize}px;
                left: ${clientX - vortexSize / 2}px; top: ${clientY - vortexSize / 2}px;
                opacity: 1;
            `;
            isVortexActive = true;
        }
        else {
            if (vortexEffectElement) {
                vortexEffectElement.style.opacity = 0;
                vortexEffectElement.remove();
                vortexEffectElement = null;
            }
            if (Date.now() - lastFlowerTime > flowerGenerationDelay) {
                createFlower(clientX, clientY, themedFlowerType);
                lastFlowerTime = Date.now();
            }
        }
    }

    function setupEventListeners() {
        window.addEventListener('mousemove', (e) => {
            targetWindEffect = (e.clientX / window.innerWidth - 0.5) * 0.4;
        });

        canvas.addEventListener('mousedown', (e) => { isDrawing = true; handleInteraction(e, 'draw'); });
        canvas.addEventListener('mousemove', (e) => { if (isDrawing) handleInteraction(e, e.shiftKey ? 'vortex' : 'draw'); });
        const stopDrawing = () => {
            isDrawing = false; isVortexActive = false;
            if (vortexEffectElement) {
                vortexEffectElement.style.opacity = 0;
                vortexEffectElement.remove();
                vortexEffectElement = null;
            }
        };
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);

        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; handleInteraction(e, 'draw'); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDrawing) handleInteraction(e, 'draw'); }, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        canvas.addEventListener('click', (e) => {
            const clickRadiusSq = 30 * 30;
            for (let i = flowers.length - 1; i >= 0; i--) {
                const flower = flowers[i];
                const dx = e.clientX - flower.x;
                const dy = e.clientY - flower.y;
                if (dx * dx + dy * dy < clickRadiusSq * flower.scale * flower.scale) {
                    createSparkle(e.clientX, e.clientY, 20);
                    flowers.splice(i, 1);
                    break;
                }
            }
        });
    }

    // --- Character Logic ---
    // Functions createCharacterMessage, createCharacterFinaleSparkle, showCharacter, characterCycle remain largely the same
    // as they manage DOM elements which is acceptable for a few items.
    function createCharacterMessage(character, x, y) {
        const message = document.createElement('div');
        message.classList.add('character-message');
        message.classList.add(`character-message-${character.name}`);
        message.textContent = character.messages[Math.floor(Math.random() * character.messages.length)];
        
        document.body.appendChild(message); // Append to get size
        const messageWidth = message.offsetWidth;
        
        let messageX = x;
        let messageY = y - 120;

        if (messageX + messageWidth > window.innerWidth - 20) messageX = window.innerWidth - messageWidth - 20;
        if (messageX < 20) messageX = 20;
        if (messageY < 20) messageY = y + 20;

        message.style.left = `${messageX}px`;
        message.style.top = `${messageY}px`;
        
        garden.appendChild(message);
        setTimeout(() => message.remove(), 7000);
    }

    function createCharacterFinaleSparkle(x, y) {
        const finaleSparkle = document.createElement('div');
        finaleSparkle.classList.add('character-finale-sparkle');
        const size = 100 + Math.random() * 50;
        finaleSparkle.style.cssText = `
            width: ${size}px; height: ${size}px;
            left: ${x - size / 2}px; top: ${y - size / 2}px;
        `;
        garden.appendChild(finaleSparkle);
        setTimeout(() => finaleSparkle.remove(), 1500);
    }

    function showCharacter(characterInfo) {
        if (activeCharacters[characterInfo.name] && garden.contains(activeCharacters[characterInfo.name])) return;
        
        themedFlowerType = characterInfo.flowerType;
        const characterElement = document.createElement('img');
        characterElement.src = characterInfo.src;
        characterElement.classList.add('character');

        let animation = `float-character ${5 + Math.random() * 5}s ease-in-out infinite alternate, character-appear 0.8s ease-out forwards`;
        if (characterInfo.name === 'snoopy') animation += ', character-color-change 20s linear infinite';
        characterElement.style.animation = animation;

        if (characterInfo.type === 'guest') {
            characterElement.style.width = '120px';
            characterElement.style.filter = 'drop-shadow(0 0 15px rgba(255, 255, 255, 1))';
        }

        let x, y;
        const maxAttempts = 30;
        const newCharWidth = (characterInfo.type === 'guest') ? 120 : 80;
        const newCharHeight = newCharWidth * 1.2;
        const padding = 25;

        for (let i = 0; i < maxAttempts; i++) {
            x = Math.random() * (window.innerWidth - newCharWidth);
            y = Math.random() * (window.innerHeight - newCharHeight);
            let overlaps = Object.values(activeCharacters).some(existingElement => {
                if (!existingElement || !garden.contains(existingElement)) return false;
                const rect = existingElement.getBoundingClientRect();
                const newRect = { left: x - padding, top: y - padding, right: x + newCharWidth + padding, bottom: y + newCharHeight + padding };
                return newRect.left < rect.right && newRect.right > rect.left && newRect.top < rect.bottom && newRect.bottom > rect.top;
            });
            if (!overlaps) break;
        }

        characterElement.style.left = `${x}px`;
        characterElement.style.top = `${y}px`;
        garden.appendChild(characterElement);
        activeCharacters[characterInfo.name] = characterElement;

        const disappear = () => {
            characterElement.classList.add('disappear');
            const rect = characterElement.getBoundingClientRect();
            const charX = rect.left + rect.width / 2;
            const charY = rect.top + rect.height / 2;
            createCharacterMessage(characterInfo, charX, charY);
            createCharacterFinaleSparkle(charX, charY);
            setTimeout(() => {
                characterElement.remove();
                activeCharacters[characterInfo.name] = null;
                if (themedFlowerType === characterInfo.flowerType) themedFlowerType = null;
                removeFlowersByType(characterInfo.flowerType);
            }, 600);
        };

        const autoDisappearTimeout = setTimeout(disappear, 6000);
        const handleInteraction = (e) => {
            if (e.type === 'touchend') e.preventDefault();
            clearTimeout(autoDisappearTimeout);
            disappear();
            characterElement.removeEventListener('click', handleInteraction);
            characterElement.removeEventListener('touchend', handleInteraction);
        };
        characterElement.addEventListener('click', handleInteraction);
        characterElement.addEventListener('touchend', handleInteraction);
    }

    const sequentialCharacters = characters.slice(); // Make a copy to not modify the original

    function characterCycle() {
        if (sequentialCharacters.length > 0) {
            // Sequential phase
            const characterToShow = sequentialCharacters.shift(); // Get and remove the first character
            if (characterToShow) {
                showCharacter(characterToShow);
            }
        } else {
            // Random phase
            if (Math.random() < 0.7) {
                if (snoopyInfo && !activeCharacters[snoopyInfo.name]) showCharacter(snoopyInfo);
            } else {
                const guestCharacters = characters.filter(c => c.type === 'guest');
                const isGuestActive = guestCharacters.some(c => activeCharacters[c.name]);
                if (!isGuestActive) {
                    if (guestCharacters.length > 0) {
                        showCharacter(guestCharacters[Math.floor(Math.random() * guestCharacters.length)]);
                    }
                }
            }
        }
        setTimeout(characterCycle, 2000 + Math.random() * 2500);
    }

    // --- Start Everything ---
    setupEventListeners();
    setInterval(createDustParticle, 500);
    setInterval(createPetalParticle, 800);
    setTimeout(characterCycle, 10000);
    requestAnimationFrame(animate);
});