/**
 * Daggerheart Risk It All - v3.14
 * Features: 6s Countdown, Close Button, Audio Overlap Fix.
 */

const MODULE_ID = 'daggerheart-risk-it-all';
const SOCKET_NAME = `module.${MODULE_ID}`;

class RiskItAll {
    // Store request sound promise to stop it later
    static currentRequestSound = null;

    static init() {
        console.log("Daggerheart Risk It All | Initializing");
        
        RiskItAll._registerSettings();

        // Register Socket
        game.socket.on(SOCKET_NAME, (payload) => {
            switch (payload.type) {
                case 'SHOW_UI':
                    RiskItAll._handleShowUI(payload);
                    break;
                case 'PLAY_MEDIA':
                    RiskItAll._playMedia(payload.mediaKey);
                    break;
                case 'PLAY_SOUND':
                    RiskItAll._playSound(payload.soundKey);
                    break;
            }
        });

        // Expose global API
        window.RiskItAll = {
            trigger: RiskItAll.gmTriggerFlow
        };
    }

    static _registerSettings() {
        const imagePicker = { type: String, scope: 'world', config: true, filePicker: 'image' };
        const audioPicker = { type: String, scope: 'world', config: true, filePicker: 'audio' };

        // --- IMAGES ---
        game.settings.register(MODULE_ID, 'backgroundPath', {
            name: "Image: Background",
            hint: "Roll screen background.",
            ...imagePicker,
            default: `modules/${MODULE_ID}/assets/images/roll-screen.webp`
        });

        game.settings.register(MODULE_ID, 'hopePath', {
            name: "Image: Hope",
            hint: "Result: Hope > Fear.",
            ...imagePicker,
            default: `modules/${MODULE_ID}/assets/images/hope.webp`
        });

        game.settings.register(MODULE_ID, 'fearPath', {
            name: "Image: Fear",
            hint: "Result: Fear > Hope.",
            ...imagePicker,
            default: `modules/${MODULE_ID}/assets/images/fear.webp`
        });

        game.settings.register(MODULE_ID, 'criticalPath', {
            name: "Image: Critical",
            hint: "Result: Critical (Tie).",
            ...imagePicker,
            default: `modules/${MODULE_ID}/assets/images/critical.webp`
        });

        // --- UI TEXT ---
        game.settings.register(MODULE_ID, 'rollText', {
            name: "Text: Subtitle",
            hint: "Displayed below the roll button.",
            type: String,
            scope: 'world',
            config: true,
            default: "Death or Legend. Your choice!"
        });

        // --- SOUNDS ---
        game.settings.register(MODULE_ID, 'soundRoll', {
            name: "Sound: Roll Request",
            hint: "Played when roll button appears.",
            ...audioPicker,
            default: `modules/${MODULE_ID}/assets/audio/roll-screen.mp3`
        });

        game.settings.register(MODULE_ID, 'soundSuspense', {
            name: "Sound: Countdown",
            hint: "Played during the 6s countdown.",
            ...audioPicker,
            default: `modules/${MODULE_ID}/assets/audio/countdown.mp3`
        });

        game.settings.register(MODULE_ID, 'soundHope', {
            name: "Sound: Hope",
            hint: "Audio when Hope wins.",
            ...audioPicker,
            default: `modules/${MODULE_ID}/assets/audio/hope.mp3`
        });

        game.settings.register(MODULE_ID, 'soundFear', {
            name: "Sound: Fear",
            hint: "Audio when Fear wins.",
            ...audioPicker,
            default: `modules/${MODULE_ID}/assets/audio/fear.mp3`
        });

        game.settings.register(MODULE_ID, 'soundCritical', {
            name: "Sound: Critical",
            hint: "Audio for Critical result.",
            ...audioPicker,
            default: `modules/${MODULE_ID}/assets/audio/critical.mp3`
        });
    }

    static async gmTriggerFlow() {
        if (!game.user.isGM) return ui.notifications.warn("Only the GM can trigger Risk it All.");

        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn("No players connected.");

        const content = `
            <div class="form-group">
                <label>Select Player:</label>
                <select id="risk-player-select" style="width: 100%">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
            </div>
        `;

        new Dialog({
            title: "Daggerheart: Risk It All",
            content: content,
            buttons: {
                trigger: {
                    label: "Trigger Risk",
                    icon: `<i class="fas fa-skull"></i>`,
                    callback: (html) => {
                        const userId = html.find('#risk-player-select').val();
                        game.socket.emit(SOCKET_NAME, {
                            type: 'SHOW_UI',
                            targetUserId: userId
                        });
                        ui.notifications.info(`Risk It All sent to player.`);
                    }
                }
            }
        }).render(true);
    }

    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const bgPath = game.settings.get(MODULE_ID, 'backgroundPath');
        const rollSound = game.settings.get(MODULE_ID, 'soundRoll');
        const rollText = game.settings.get(MODULE_ID, 'rollText');

        // Play Request Sound & Capture Promise
        if (rollSound) {
             RiskItAll.currentRequestSound = AudioHelper.play({src: rollSound, volume: 1.0, autoplay: true, loop: false}, false);
        }

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        if (bgPath) overlay.style.backgroundImage = `url('${bgPath}')`;

        // Add content + Close Button
        overlay.innerHTML = `
            <button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-times"></i> Close</button>
            <div class="risk-content-wrapper">
                <h1 class="risk-title">RISK IT ALL</h1>
                <button class="risk-btn">ROLL</button>
                <div class="risk-subtitle">${rollText}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Cancel Button Logic
        document.getElementById('risk-cancel-btn').onclick = () => {
            overlay.remove();
        };

        const btn = overlay.querySelector('.risk-btn');
        
        // Debounce
        btn.disabled = true;
        setTimeout(() => {
            btn.disabled = false;
        }, 500);

        btn.onclick = async () => {
            // FIX: Stop the "Request" sound immediately to prevent overlap
            // if the browser just released it due to the click interaction.
            if (RiskItAll.currentRequestSound) {
                const sound = await RiskItAll.currentRequestSound;
                if (sound && typeof sound.stop === 'function') {
                    sound.stop();
                }
                RiskItAll.currentRequestSound = null;
            }

            // Remove cancel button
            const cancelBtn = document.getElementById('risk-cancel-btn');
            if(cancelBtn) cancelBtn.remove();

            // 1. Disable Button & Trigger Audio
            btn.disabled = true;
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_SOUND', soundKey: 'soundSuspense' });
            RiskItAll._playSound('soundSuspense');

            // 2. Countdown Loop (6 to 1)
            for (let i = 6; i > 0; i--) {
                btn.innerText = i.toString();
                // Wait 1 second
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 3. Remove UI & Show Result
            overlay.remove();
            await RiskItAll._orchestrateSequence();
        };
    }

    static async _orchestrateSequence() {
        // --- ROLL CALCULATION ---
        const roll = new Roll('1d12 + 1d12');
        await roll.evaluate();

        // Inject Custom Colors for Dice So Nice
        // Term 0 = Hope (Yellow/Gold)
        if (roll.terms[0]) {
            roll.terms[0].options.appearance = {
                colorset: "custom",
                foreground: "#000000",
                background: "#FFD700", // Gold/Yellow
                outline: "#000000",
                texture: "none"
            };
        }

        // Term 2 = Fear (Dark Purple)
        if (roll.terms[2]) {
            roll.terms[2].options.appearance = {
                colorset: "custom",
                foreground: "#FFFFFF",
                background: "#2c003e", // Dark Purple
                outline: "#000000",
                texture: "none"
            };
        }

        // terms[0] is first die, terms[2] is second die (terms[1] is operator)
        const hopeVal = roll.terms[0].total;
        const fearVal = roll.terms[2].total;

        // --- DICE SO NICE (3D) ---
        if (game.dice3d) {
            try {
                await game.dice3d.showForRoll(roll, game.user, true);
            } catch (e) {
                console.error("RiskItAll | DSN Error:", e);
            }
        }

        // --- DETERMINE RESULT & MESSAGE ---
        let resultKey = 'hopePath';
        let messageText = "";

        if (hopeVal > fearVal) {
            resultKey = 'hopePath';
            messageText = "You stand, clearing Hit Points and/or Stress equal to the Hope Die value.";
        } else if (fearVal > hopeVal) {
            resultKey = 'fearPath';
            messageText = "You died!";
        } else {
            // Critical
            resultKey = 'criticalPath';
            messageText = "You stand and clear all Hit Points and Stress.";
        }

        // --- SHOW MEDIA & SOUND ---
        game.socket.emit(SOCKET_NAME, { type: 'PLAY_MEDIA', mediaKey: resultKey });
        RiskItAll._playMedia(resultKey); 

        // --- CHAT LOG ---
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Risk It All" }),
            content: `
                <div style="text-align: center; font-size: 1.1em; color: #f0f0f0;">
                    <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 8px; font-weight: bold;">
                        <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">Hope: ${hopeVal}</span>
                        <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">Fear: ${fearVal}</span>
                    </div>
                    <div style="border-top: 1px solid #777; padding-top: 5px;">
                        ${messageText}
                    </div>
                </div>
            `,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    static _playSound(settingKey) {
        const soundSrc = game.settings.get(MODULE_ID, settingKey);
        if (soundSrc) {
            AudioHelper.play({src: soundSrc, volume: 1.0, autoplay: true, loop: false}, false);
        }
    }

    static _playMedia(settingKey) {
        return new Promise((resolve) => {
            const src = game.settings.get(MODULE_ID, settingKey);
            
            // Play Result Sound
            let soundSetting = "";
            if (settingKey === 'hopePath') soundSetting = 'soundHope';
            if (settingKey === 'fearPath') soundSetting = 'soundFear';
            if (settingKey === 'criticalPath') soundSetting = 'soundCritical';
            if (soundSetting) RiskItAll._playSound(soundSetting);

            if (!src) {
                resolve();
                return;
            }

            const container = document.createElement('div');
            container.id = 'risk-it-all-media-container';

            let autoCloseTimer = null;
            const finish = () => {
                if(autoCloseTimer) clearTimeout(autoCloseTimer);
                if(container.parentNode) container.remove();
                resolve();
            };

            const closeBtn = document.createElement('button');
            closeBtn.className = 'media-skip-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                finish();
            };
            container.appendChild(closeBtn);

            const img = document.createElement('img');
            img.src = src;
            container.appendChild(img);
            
            // FIXED DURATION: 5 Seconds
            const duration = 5000;
            autoCloseTimer = setTimeout(finish, duration);

            document.body.appendChild(container);
        });
    }
}

Hooks.once('ready', RiskItAll.init);