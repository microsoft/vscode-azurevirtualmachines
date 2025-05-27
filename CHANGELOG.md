# Change Log

## 0.6.9 - 2025-05-0x
### Added
* [[449](https://github.com/microsoft/vscode-azurevirtualmachines/pull/449)] Add activity children for creating virtual machines

### Changed
* [[453](https://github.com/microsoft/vscode-azurevirtualmachines/pull/453)] Update default image to point to a more recent OS
* [[449](https://github.com/microsoft/vscode-azurevirtualmachines/pull/449)] Upgrade to latest version of the activity log (v2). Now shows live progress on each activity child with timers.

## 0.6.8 - 2025-05-01
## Fixed
* [[451]](https://github.com/microsoft/vscode-azurevirtualmachines/pull/451) Incomplete telemetry data capture in specific scenarios.

## 0.6.7 - 2025-03-10

### Changed
* [[439](https://github.com/microsoft/vscode-azurevirtualmachines/pull/439)] Automatically collect subscription and resource information for telemetry. [How to disable telemetry reporting](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting)
* [[442](https://github.com/microsoft/vscode-azureappservice/pull/442)] Require VS Code version 1.95.0 (October 2024) or greater

## 0.6.6 - 2024-10-04
### Added
* [[398](https://github.com/microsoft/vscode-azurevirtualmachines/pull/398)] Added create icon to ribbon command

### Changes
* [[391](https://github.com/microsoft/vscode-azurevirtualmachines/pull/391)] Improve resolve resource performance

### Fixes
* [[400](https://github.com/microsoft/vscode-azurevirtualmachines/pull/400)] Remove period from select an OS
* [[389](https://github.com/microsoft/vscode-azurevirtualmachines/pull/389)] Fix view properties command

### Engineering
* [[423](https://github.com/microsoft/vscode-azurevirtualmachines/pull/423)] Update release pipeline to support signing
* [[425](https://github.com/microsoft/vscode-azurevirtualmachines/pull/425)] [[420]](https://github.com/microsoft/vscode-azurevirtualmachines/pull/420) Upgrade packages for various improvements to telemetry reporting
* [[408](https://github.com/microsoft/vscode-azurevirtualmachines/pull/408)] Add 1ES pipeline
* [[403](https://github.com/microsoft/vscode-azurevirtualmachines/pull/403)] Update ESLint config to enforce import types
* [[394](https://github.com/microsoft/vscode-azurevirtualmachines/pull/394)] Remove onCommand activation events
* [[393](https://github.com/microsoft/vscode-azurevirtualmachines/pull/393)] Exclude dist folder from policheck
* [[386](https://github.com/microsoft/vscode-azurevirtualmachines/pull/386)] Move to track 2 SDKs

## 0.6.5 - 2023-05-17

### Added
* Add support for the upcoming Azure Resources Focus feature

## 0.6.4 - 2023-02-21

### Fixed
* Fix expected child context values by @alexweininger in [#373](https://github.com/microsoft/vscode-azurevirtualmachines/pull/373)

## 0.6.3 - 2023-01-25

### Added
* Forward compatibility for Azure Resources API v2 @alexweininger in [#367](https://github.com/microsoft/vscode-azurevirtualmachines/pull/367)

### Changes
* Update AppInsights key by @bwateratmsft in [#340](https://github.com/microsoft/vscode-azurevirtualmachines/pull/340)
* Enable all strict type checking options by @alexweininger in [#360](https://github.com/microsoft/vscode-azurevirtualmachines/pull/360)

## 0.6.2 - 2022-06-30

### Changed
- Update @vscode/extension-telemetry to 0.6.2 [#334](https://github.com/microsoft/vscode-azurevirtualmachines/pull/334)

## 0.6.1 - 2022-06-01

### Changed
- Update @vscode/extension-telemetry to 0.5.2 [#328](https://github.com/microsoft/vscode-azurevirtualmachines/pull/328)

## 0.6.0 - 2022-05-24

We've made some large design changes to the Azure extensions for VS Code. [View App Centric release notes](https://aka.ms/AzCode/AppCentric)

## 0.5.0 - 2022-01-25

### Added
- Support for creating Virtual Machines in extended regions using Advanced create.

## 0.4.1 - 2021-08-24

### Changed
- Minimum version of VS Code is now 1.57.0
### Fixed
- [No longer display locations that are unavailable](https://github.com/microsoft/vscode-azurevirtualmachines/issues/20)

## 0.4.0 - 2021-05-13
### Added
- Now depends on the "Azure Resources" extension, which provides a "Resource Groups" and "Help and Feedback" view

### Changed
- "Report an Issue" button was removed from errors. Use the "Help and Feedback" view or command palette instead
- Icons updated to match VS Code's theme. Install new product icon themes [here](https://marketplace.visualstudio.com/search?term=tag%3Aproduct-icon-theme&target=VSCode)

### Fixed
- [Bugs fixed](https://github.com/microsoft/vscode-azurevirtualmachines/milestone/9?closed=1)

## 0.3.0 - 2021-02-08

### Added
- Delete VM with associated resources
- Connect to Host via [Visual Studio Code Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)

### Fixed
- [Bugs fixed](https://github.com/microsoft/vscode-azurevirtualmachines/issues?q=is%3Aissue+milestone%3A0.3.0+is%3Aclosed)

## 0.2.0 - 2020-08-27

### Added
- Advanced creation that allows you to manually select properties (i.e. the OS, the image) when creating the VM
- `Copy IP Address` and `View Properties` on virtual machines items

### Removed
- Resource group name from label

### Fixed
- [Bugs fixed](https://github.com/microsoft/vscode-azurevirtualmachines/milestone/5?closed=1)

## 0.1.1 - 2020-06-16

### Changed
- Defaults to install as a UI Extension
    - Read more about that [here](https://code.visualstudio.com/api/advanced-topics/remote-extensions)

### Fixed
- Creating a VM would fail if a `.ssh` folder didn't already exist [#87](https://github.com/microsoft/vscode-azurevirtualmachines/issues/87)
- Error messages that were masked incorrectly [#93](https://github.com/microsoft/vscode-azurevirtualmachines/issues/93)

## 0.1.0 - 2020-03-05

### Added
- View, create, delete, start, and stop Azure Virtual Machines
- Add SSH key to existing Azure Virtual Machines
