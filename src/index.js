import shaka from "shaka-player/dist/shaka-player.ui.js";

const exampleManifestUri =
  "https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd";

function initApp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  // Check to see if the browser supports the basic APIs Shaka needs.
  if (!shaka.Player.isBrowserSupported()) {
    // This browser does not have the minimum set of APIs we need.
    console.error("Browser not supported!");
  }

  addNetworkListeners();
}

// this function initializes the player and adds the event listeners
async function initPlayer() {
  const video = document.getElementById("video");
  const container = document.getElementById("container");
  const player = new shaka.Player(video);

  // we will need this in other functions so we assign it to the window object
  window.player = player;

  const ui = new shaka.ui.Overlay(player, container, video);
  const controls = ui.getControls();
  controls.addEventListener("error", console.error);

  player.addEventListener("error", console.error);

  initOfflineStorage(player);

  const downloadButton = document.getElementById("download-button");
  downloadButton.addEventListener("click", downloadContent);

  try {
    await player.load(exampleManifestUri);
  } catch (error) {
    console.error(error);
  }
}

/* Update the online status and add listeners so that we can display
  the network state to the user. */
function addNetworkListeners() {
  updateOnlineStatus();
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
}

// grabs an html element and modifies it depending on your network status
function updateOnlineStatus() {
  const signal = document.getElementById("online-indicator");
  if (navigator.onLine) {
    signal.innerHTML = "You are ONLINE";
    signal.style.background = "green";
  } else {
    signal.innerHTML = "You are OFFLINE";
    signal.style.background = "black";
  }
}

// donwloads the content and stores it in the browser
async function downloadContent(event) {
  event.target.disabled = true;

  try {
    const metadata = {
      title: "Test content",
      downloaded: new Date(),
    };

    // use shaka.offline.Storage to download the content
    console.log("Downloading content...");
    await window.storage.store(exampleManifestUri, metadata);
    console.log("Content downloaded!");
  } catch (error) {
    console.error(error);
  }
}

function initOfflineStorage(player) {
  // assign the storage object to the window so that we can access it later
  window.storage = new shaka.offline.Storage(player);
  window.storage.configure({
    offline: {
      progressCallback: setDownloadProgress,
    },
  });
  refreshDownloads();
}

// updates the progress number in the html
function setDownloadProgress(_, progress) {
  const progressElement = document.getElementById("download-progress");
  const progressInPercent = progress.toFixed(2) * 100;
  progressElement.setAttribute("value", progressInPercent);
  progressElement.innerText = `${Math.floor(progressInPercent)}%`;

  if (progress === 1) {
    // refresh download list when download is finished
    refreshDownloads();
  }
}

// fetches list of downloaded files in indexedDB
async function refreshDownloads() {
  const downloadList = document.getElementById("downloaded-content");
  const content = await window.storage.list();
  downloadList.innerHTML = "";
  if (content.length === 0) {
    const listItem = document.createElement("li");
    listItem.innerText = "No downloads yet";
    downloadList.appendChild(listItem);
    return;
  }

  // list content from indexedDB and add buttons to play and remove content

  content.forEach((item) => {
    const listItem = document.createElement("li");

    const playButton = document.createElement("button");
    playButton.className = "play-button";
    playButton.innerText = "Play";
    playButton.addEventListener("click", () => {
      window.player.load(item.offlineUri);
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.innerText = "Remove";
    removeButton.addEventListener("click", async () => {
      await window.storage.remove(item.offlineUri);
      refreshDownloads();
    });

    listItem.innerText = item.appMetadata.title;
    listItem.appendChild(playButton);
    listItem.appendChild(removeButton);
    downloadList.appendChild(listItem);

    const downloadButton = document.getElementById("download-button");
    downloadButton.disabled = false;
  });
}

document.addEventListener("DOMContentLoaded", initApp);
document.addEventListener("shaka-ui-loaded", initPlayer);
