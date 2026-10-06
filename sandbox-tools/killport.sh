#!/bin/bash
# Kills processes whose command line contains $1 (never this script itself).
for p in /proc/[0-9]*; do
  pid=$(basename $p); [ "$pid" = "$$" ] && continue
  c=$(tr '\0' ' ' < $p/cmdline 2>/dev/null)
  case "$c" in *"$1"*) case "$c" in *killport*) ;; *) kill $pid 2>/dev/null && echo "killed $pid: $c";; esac;; esac
done
