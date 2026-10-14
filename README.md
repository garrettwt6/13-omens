# 13 Omens tabletop companion

A static browser app for hosting a table and managing protagonists, adventures, and dice checks. No build framework, package installation, or application server is required.

## GitHub Pages

The root `index.html` forwards visitors to the app when Pages publishes directly from `main`. The workflow in `.github/workflows/pages.yml` runs the regression tests and publishes the HTML app as `index.html`, together with both adventure JSON files. The rules PDF stays in the repository and is not included in the deployed site.

To activate hosting:

1. Commit and push the app changes, tests, README, and workflow to `main`.
2. Open the repository's **Settings → Pages** and choose **GitHub Actions** as the source.
3. Open **Actions → Deploy app to GitHub Pages** and run the workflow if the push happened before Pages was enabled.
4. Wait for a successful deployment. Use the URL shown by the deployment on both devices.

The expected URL is `https://garrettwt6.github.io/13-omens/`; it is not live until GitHub completes deployment.

## Start a table

On the computer, open the hosted app, select **Host Chamber**, and keep the tab open and the device awake. Download [the Hollybrook adventure](hollybrook.adventure.json), import it using the adventure file picker, and activate it. [The blank adventure](blank.adventure.json) is a template for custom content.

On the phone, open the same hosted app directly in Chrome or Safari, select **Player Dossier**, and enter the computer's current room code. Both devices must have internet access. The host shares the active adventure with connected players.

HTTPS hosting ensures both devices can load the same app version. Table connections still use PeerJS/WebRTC; hosting alone does not guarantee connectivity. Networks that block direct connections may require a tested TURN relay over TCP/TLS. The app reports connection errors and times out unsuccessful joins after 20 seconds.

Character sheets and imported adventures are saved in browser local storage. Local-file and hosted versions have separate storage; export existing characters before switching URLs and keep those exports as backups.

## Local development

From the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `13_omens_visual_qa_v4.html` through that server for local development. The deployment workflow creates `index.html` from this source; edit the source HTML rather than maintaining a second copy.

Run regression tests with Node.js 22 or later:

```sh
node --test tests/*.test.cjs
```

The tests cover direct-Omen dice selection and connection failure handling. Actual connections between devices require separate live multiplayer testing.
