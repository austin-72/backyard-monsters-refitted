This folder is what players download. It is bound into the Docker container: changes are live at once.

  launcher.swf       2 KB, shipped built (source: client/launcher/IOLauncher.as, task "compile-launcher").
                     Served at  https://<your host>/play.swf  (and /bymr-stable.swf).
                     It asks the server which build is current and loads exactly that build.
  bymr-stable.swf    the game. Put here by publish-client.cmd (VS Code task "BYMR - Release").
                     Served at  /bymr-stable.swf?v=<build>, the address the launcher is given.

Players run:   flashplayer.exe https://<your host>/play.swf        (no quotes around the address)
