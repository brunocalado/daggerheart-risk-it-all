# 🗡️ Daggerheart: Risk It All

**Daggerheart: Risk It All** is a Foundry VTT module designed to elevate the tension and immersion of one of the most critical moments in the game. When a player decides to "Risk It All," instead of a simple dice roll in the chat, this module triggers a cinematic audiovisual experience for all connected players.

---

## 🌟 Features

* **Immersive Workflow:** A dedicated full-screen overlay appears for the player, asking them to confirm their choice between **"Death or Legend"**.
* **Suspenseful Countdown:** Once the player commits, a dramatic **6-second countdown** begins, accompanied by suspenseful audio, building anticipation for the entire party.
* **3D Dice Integration:** Seamlessly integrates with Dice So Nice! to roll the specific Hope and Fear dice (customized with **Gold and Dark Purple** colors) directly on the screen.
* **Cinematic Results:** Immediately after the roll, a full-screen image and sound effect play based on the outcome:
    * **Hope:** Triumph and recovery.
    * **Fear:** The ultimate price.
    * **Critical:** A miraculous success.
* **Customizable Assets:** All images (backgrounds, results) and sound effects (request, countdown, results) are fully customizable via the module settings.
* **Automatic Rules:** The module automatically calculates the result (Hope vs Fear) and posts the correct Daggerheart rule interpretation to the chat.

---

## 🚀 Manual Installation

Go to **modules** and paste the link. 
Link:
https://raw.githubusercontent.com/brunocalado/daggerheart-risk-it-all/main/module.json

---

## 🛠️ Usage

1.  **GM Trigger:** As a Gamemaster, create a macro with the following command:
    ```javascript
    RiskItAll.trigger();
    ```
2.  **Select Player:** Run the macro and select the player who is risking it all from the dialog list.
3.  **The Moment:** The selected player will receive the "Risk It All" screen. Once they click **ROLL**, the sequence begins for everyone.

---

## ⚙️ Configuration

Go to **Configure Settings > Module Settings > Daggerheart: Risk It All** to customize:

* **Images:** Set your own images for the roll screen, Hope result, Fear result, and Critical result.
* **Sounds:** Upload your own audio files for the roll request, countdown, and outcome stingers.
* **Text:** Change the subtitle text displayed on the button (default: "Death or Legend. Your choice!").

---

### Credits and License

- Code license at [LICENSE](LICENSE).
- The images are AI, so they are under [public domain](https://creativecommons.org/publicdomain/zero/1.0/).
- **Disclaimer:** This module is an independent creation and is not affiliated with Darrington Press.