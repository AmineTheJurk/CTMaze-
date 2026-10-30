# Corn Thief Maze - BeeWare Android build

Requires Python 3.10+ and Android SDK (Briefcase installs what it can).

    pip install briefcase
    briefcase create android
    briefcase build android
    briefcase run android        # emulator or USB device

The game files are in src/cornthief/www. Replace them to update the game.
The local server runs on 127.0.0.1:9090 like game.py did.

Not built or run here: this sandbox has no Android SDK and cannot reach Google's Android repositories.

Known risk: Android blocks plain HTTP by default for newer target SDKs. Loopback
HTTP is often allowed, but if the WebView shows a blank page, add
android:usesCleartextTraffic="true" to the application tag in the generated
AndroidManifest.xml (under the briefcase android gradle project) and rebuild.

## Build the APK on GitHub

The workflow in .github/workflows/android.yml builds a debug APK on every push to main,
on pull requests, and on demand from the Actions tab (Run workflow). Download the APK
from the run's Artifacts section.
