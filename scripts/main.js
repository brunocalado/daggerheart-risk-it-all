/**
 * Daggerheart Risk It All - v3.16
 * Features: 6s Countdown, Close Button, Audio Debounce Fix, I18n Support.
 */

const MODULE_ID = 'daggerheart-risk-it-all';
const SOCKET_NAME = `module.${MODULE_ID}`;

class RiskItAll {
    static currentRequestSound = null;

    static init() {
        console.log("Daggerheart Risk It All | Initializing");
        RiskItAll._registerSettings();
        game.socket.on(SOCKET_NAME, (payload) => {
            switch (payload.type) {
                case 'SHOW_UI': RiskItAll._handleShowUI(payload); break;
                case 'PLAY_MEDIA': RiskItAll._playMedia(payload.mediaKey); break;
                case 'PLAY_SOUND': RiskItAll._playSound(payload.soundKey); break;
            }
        });
        window.RiskItAll = { trigger: RiskItAll.gmTriggerFlow };
    }

    static _registerSettings() {
        const imagePicker = { type: String, scope: 'world', config: true, filePicker: 'image' };
        const audioPicker = { type: String, scope: 'world', config: true, filePicker: 'audio' };

        game.settings.register(MODULE_ID, 'backgroundPath', { name: "RISK_IT_ALL.Settings.Background.Name", hint: "RISK_IT_ALL.Settings.Background.Hint", ...imagePicker, default: `modules/${MODULE_ID}/assets/images/roll-screen.webp` });
        game.settings.register(MODULE_ID, 'hopePath', { name: "RISK_IT_ALL.Settings.Hope.Name", hint: "RISK_IT_ALL.Settings.Hope.Hint", ...imagePicker, default: `modules/${MODULE_ID}/assets/images/hope.webp` });
        game.settings.register(MODULE_ID, 'fearPath', { name: "RISK_IT_ALL.Settings.Fear.Name", hint: "RISK_IT_ALL.Settings.Fear.Hint", ...imagePicker, default: `modules/${MODULE_ID}/assets/images/fear.webp` });
        game.settings.register(MODULE_ID, 'criticalPath', { name: "RISK_IT_ALL.Settings.Critical.Name", hint: "RISK_IT_ALL.Settings.Critical.Hint", ...imagePicker, default: `modules/${MODULE_ID}/assets/images/critical.webp` });

        game.settings.register(MODULE_ID, 'rollText', { name: "RISK_IT_ALL.Settings.RollText.Name", hint: "RISK_IT_ALL.Settings.RollText.Hint", type: String, scope: 'world', config: true, default: game.i18n.localize("RISK_IT_ALL.Settings.RollText.Default") });

        game.settings.register(MODULE_ID, 'soundRoll', { name: "RISK_IT_ALL.Settings.SoundRoll.Name", hint: "RISK_IT_ALL.Settings.SoundRoll.Hint", ...audioPicker, default: `modules/${MODULE_ID}/assets/audio/roll-screen.mp3` });
        game.settings.register(MODULE_ID, 'soundSuspense', { name: "RISK_IT_ALL.Settings.SoundSuspense.Name", hint: "RISK_IT_ALL.Settings.SoundSuspense.Hint", ...audioPicker, default: `modules/${MODULE_ID}/assets/audio/countdown.mp3` });
        game.settings.register(MODULE_ID, 'soundHope', { name: "RISK_IT_ALL.Settings.SoundHope.Name", hint: "RISK_IT_ALL.Settings.SoundHope.Hint", ...audioPicker, default: `modules/${MODULE_ID}/assets/audio/hope.mp3` });
        game.settings.register(MODULE_ID, 'soundFear', { name: "RISK_IT_ALL.Settings.SoundFear.Name", hint: "RISK_IT_ALL.Settings.SoundFear.Hint", ...audioPicker, default: `modules/${MODULE_ID}/assets/audio/fear.mp3` });
        game.settings.register(MODULE_ID, 'soundCritical', { name: "RISK_IT_ALL.Settings.SoundCritical.Name", hint: "RISK_IT_ALL.Settings.SoundCritical.Hint", ...audioPicker, default: `modules/${MODULE_ID}/assets/audio/critical.mp3` });
    }

    static async gmTriggerFlow() {
        if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("RISK_IT_ALL.Notifications.GMOnly"));
        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn(game.i18n.localize("RISK_IT_ALL.Notifications.NoPlayers"));

        const content = `
            <div class="form-group">
                <label>${game.i18n.localize("RISK_IT_ALL.Dialog.SelectPlayer")}</label>
                <select id="risk-player-select" style="width: 100%">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
            </div>
        `;

        new Dialog({
            title: game.i18n.localize("RISK_IT_ALL.Title"), content: content, buttons: {
                trigger: { label: game.i18n.localize("RISK_IT_ALL.Dialog.TriggerButton"), icon: `<i class="fas fa-skull"></i>`, callback: (html) => {
                    const userId = html.find('#risk-player-select').val();
                    game.socket.emit(SOCKET_NAME, { type: 'SHOW_UI', targetUserId: userId });
                    ui.notifications.info(game.i18n.localize("RISK_IT_ALL.Notifications.Sent"));
                }}
            }
        }).render(true);
    }

    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const bgPath = game.settings.get(MODULE_ID, 'backgroundPath');
        const rollSound = game.settings.get(MODULE_ID, 'soundRoll');
        const rollText = game.settings.get(MODULE_ID, 'rollText');

        if (rollSound) {
             RiskItAll.currentRequestSound = AudioHelper.play({src: rollSound, volume: 1.0, autoplay: true, loop: false}, false);
        }

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        if (bgPath) overlay.style.backgroundImage = `url('${bgPath}')`;

        overlay.innerHTML = `
            <button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-times"></i> ${game.i18n.localize("RISK_IT_ALL.UI.Close")}</button>
            <div class="risk-content-wrapper">
                <h1 class="risk-title">RISK IT ALL</h1>
                <button class="risk-btn">${game.i18n.localize("RISK_IT_ALL.UI.Roll")}</button>
                <div class="risk-subtitle">${rollText}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('risk-cancel-btn').onclick = () => { overlay.remove(); };

        const btn = overlay.querySelector('.risk-btn');
        btn.disabled = true; 
        setTimeout(() => { btn.disabled = false; }, 500);

        btn.onclick = async () => {
            if (RiskItAll.currentRequestSound) {
                const sound = await RiskItAll.currentRequestSound;
                if (sound && typeof sound.stop === 'function') sound.stop();
                RiskItAll.currentRequestSound = null;
            }

            const cancelBtn = document.getElementById('risk-cancel-btn');
            if(cancelBtn) cancelBtn.remove();

            btn.disabled = true;
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_SOUND', soundKey: 'soundSuspense' });
            RiskItAll._playSound('soundSuspense');

            for (let i = 6; i > 0; i--) {
                btn.innerText = i.toString();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            overlay.remove();
            await RiskItAll._orchestrateSequence();
        };
    }

    static async _orchestrateSequence() {
        const roll = new Roll('1d12 + 1d12');
        await roll.evaluate();

        if (roll.terms[0]) {
            roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", outline: "#000000", texture: "none" };
        }
        if (roll.terms[2]) {
            roll.terms[2].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", outline: "#000000", texture: "none" };
        }

        const hopeVal = roll.terms[0].total;
        const fearVal = roll.terms[2].total;

        if (game.dice3d) {
            try { await game.dice3d.showForRoll(roll, game.user, true); } catch (e) { console.error("RiskItAll | DSN Error:", e); }
        }

        let resultKey = 'hopePath';
        let messageText = "";

        if (hopeVal > fearVal) {
            resultKey = 'hopePath';
            messageText = game.i18n.localize("RISK_IT_ALL.Chat.ResultHope");
        } else if (fearVal > hopeVal) {
            resultKey = 'fearPath';
            messageText = game.i18n.localize("RISK_IT_ALL.Chat.ResultFear");
        } else {
            resultKey = 'criticalPath';
            messageText = game.i18n.localize("RISK_IT_ALL.Chat.ResultCritical");
        }

        game.socket.emit(SOCKET_NAME, { type: 'PLAY_MEDIA', mediaKey: resultKey });
        RiskItAll._playMedia(resultKey); 

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Risk It All" }),
            content: `
                <div style="text-align: center; font-size: 1.1em; color: #f0f0f0;">
                    <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 8px; font-weight: bold;">
                        <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">${game.i18n.localize("RISK_IT_ALL.Chat.HopeLabel")}: ${hopeVal}</span>
                        <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">${game.i18n.localize("RISK_IT_ALL.Chat.FearLabel")}: ${fearVal}</span>
                    </div>
                    <div style="border-top: 1px solid #777; padding-top: 5px;">${messageText}</div>
                </div>
            `,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    static _playSound(settingKey) {
        const soundSrc = game.settings.get(MODULE_ID, settingKey);
        if (soundSrc) AudioHelper.play({src: soundSrc, volume: 1.0, autoplay: true, loop: false}, false);
    }

    static _playMedia(settingKey) {
        return new Promise((resolve) => {
            const src = game.settings.get(MODULE_ID, settingKey);
            let soundSetting = "";
            if (settingKey === 'hopePath') soundSetting = 'soundHope';
            if (settingKey === 'fearPath') soundSetting = 'soundFear';
            if (settingKey === 'criticalPath') soundSetting = 'soundCritical';
            if (soundSetting) RiskItAll._playSound(soundSetting);

            if (!src) { resolve(); return; }

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
            closeBtn.innerHTML = '<i class="fas fa-times"></i> ' + game.i18n.localize("RISK_IT_ALL.UI.Close");
            closeBtn.onclick = (e) => { e.stopPropagation(); finish(); };
            container.appendChild(closeBtn);

            const img = document.createElement('img');
            img.src = src;
            container.appendChild(img);
            
            const duration = 5000;
            autoCloseTimer = setTimeout(finish, duration);
            document.body.appendChild(container);
        });
    }
}
Hooks.once('ready', RiskItAll.init);