# Analysis of VS Code Extension Structure

## Generate a skeleton project

You can use `Yeoman VS Code Extension generator` to scaffold a new extension.

The `extensioni.ts` file also exports an `activate()` function.

> **Note:** VS Code will invoke it once when any of `activationEvents` was described in `package.json`.

> **Note: **About `package.json`, you could read the [extension manifest reference](null).

## New Structure of ESP32 Extension

- src
  - backend
  - frontend
  - controller

> **Note: **`LaunchRequestArguments` is  same as `debuggers/configurationAttributes` under `package.json`.

`OpenOCD-ESP` relies on `msys2` environment

Possible Solutions:

- Run an integrated terminal
- Spawn a bash shell and run it

The implementation of debug adapter must follow:
1. Call Request => Send Response (Pair)