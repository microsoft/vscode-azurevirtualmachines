# Change Log

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
