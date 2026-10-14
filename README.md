# 13 Omens tabletop companion

Run a table from your computer, with phones and other computers connected over the same private Wi-Fi. The host's browser controls game rules and dice supply; a small local Node.js server serves the app and routes messages over WebSockets. No cloud account, paid hosting, TURN relay, or internet connection is needed during play. Optional Google Fonts fall back to installed fonts without internet access.

## Start a local table

On Windows, after installing Node.js and extracting the repository, double-click `start-server.bat`. It runs from its own folder, installs missing dependencies using `npm.cmd ci`, and starts the server using `npm.cmd start`. Keep its window open while playing. The first installation needs internet access. The manual steps below work too; in PowerShell, use `npm.cmd` instead of `npm` if script execution is disabled.

1. Install Node.js 22 or newer from https://nodejs.org/ on the host computer.
2. Download this repository using **Code → Download ZIP** and extract it, or clone it with Git.
3. Open a terminal in the extracted repository folder and install dependencies once:

   ```sh
   npm ci
   ```

4. Start the server before each session:

   ```sh
   npm start
   ```

5. On the computer, open the **Computer** address printed in the terminal. Select **Host Chamber**, import `hollybrook.adventure.json` from the repository folder, and activate it. `blank.adventure.json` is a custom adventure template.
6. On every phone, open one of the **Share with players on your Wi-Fi** addresses printed in the terminal directly in Safari or Chrome. Select **Player Dossier** and enter the host's current room code.

Use the computer's Wi-Fi address on phones; `localhost` on a phone points to the phone itself. If several addresses are printed, use the address for the computer's active Wi-Fi connection. Allow Node.js or TCP port 3000 through the host's firewall on the private network if prompted. Guest Wi-Fi or router client isolation may block access.

Keep the terminal and Host Chamber tab open, and keep the computer awake. Stop the server with Ctrl+C after the session. The server listens on all interfaces so phones can reach it; use it on a trusted private network and do not forward its port to the internet. Table codes are for selecting a table, not authentication.

The server holds room membership in memory, and the host browser holds game state. Closing the host ends its table; restarting the server disconnects everyone. Players can reconnect with the current code while the host is still present. Character sheets and adventure imports persist in browser local storage. Export characters before changing from downloaded files or GitHub Pages to the local server, because each address has separate storage.

## Troubleshooting

- **The phone cannot open the address:** check both devices are on the same Wi-Fi, the computer is awake, the server is running, and the firewall allows port 3000.
- **Host not found:** keep the Host Chamber tab open and enter its current room code.
- **Connection fails on GitHub Pages or a downloaded HTML file:** use the address printed by `npm start`. Those versions support solo play; GitHub Pages cannot run the local WebSocket server.
- **Port 3000 is already in use:** stop the other process or set `PORT` before starting the server (for example, `PORT=3001 npm start` on macOS/Linux or `$env:PORT=3001; npm start` in PowerShell).

## Development and tests

```sh
npm ci
npm test
npm start
```

`13_omens_visual_qa_v4.html` is the main UI and rule engine. `local-peer.js` adapts its existing host/player message interface to the local server. `server.cjs` serves an explicit list of public files, assigns guest identities, and routes messages within their table.

Tests exercise dice rules, browser connection failure handling, and live WebSocket routing with a host and two players. Physical-device connectivity still depends on the host firewall and local network.

## GitHub Pages

The Pages workflow tests and publishes a static **solo-play** version with the adventure files. It does not provide multiplayer hosting. The root `index.html` also opens the app when Pages publishes directly from the branch. To play together, run the local server above.
