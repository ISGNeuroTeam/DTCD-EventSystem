# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0]

### Added

- ID, name and type of subscription

### Changed

- improved API of methods `subscribe` and `unsubscribe`

### Fixed

- bug of execution a several actions
- bug with subscribing a custom action to an event due to `actionGUID`

## [0.5.0]

### Fixed

- fixed manual adding of custom event

## [0.4.0]

### Added

- version of core systems for adapters

### Changed

- build process in order to make directory name with current version of pluing

## [0.3.0]

### Added

- integrated log system
- token to subscription
- custom actions support
- added proper event args comparison
- removeCustomAction method

### Changed

- changed version of SDK
- all logs now recorded with 'debug' level

## Fixed

- renamed log method to a new one

## [0.2.0] - 2021-02-11

### Changed

- code source directory name to DTCD-EventSystem
- downloading DTCD-SDK from [storage](http://storage.dev.isgneuro.com)
- paths in source files to DTCD-SDK
- [Makefile](Makefile) to current project structure

## [0.1.0] - 2021-02-09

- Added main functional
