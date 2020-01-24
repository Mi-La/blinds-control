# Blinds Control

React Native project for controlling blinds using [rts-controller](https://gitlab.com/zub2/rts-controller) from phone.

## Prerequisities

The application is closely bound to the [rts-controller](https://gitlab.com/zub2/rts-controller) and its custom [TCP protocol](https://gitlab.com/zub2/rts-controller#tcp-frontend-command-syntax)
(plain text commands over a TCP socket) and is designed to work only with this counterpart.

## Features

* automatically obtains list of defined controllers and creates UI for them
* sends commands (`up`, `down`, `my`, `prog`) over the TCP socket
* automatically reconnects when app goes background/foreground

## Author

* [Mi-L@](https://github.com/Mi-La) (also on [gitlab](https://gitlab.com/Mi-La))

## License

This project is licenced under the GNU Lesser General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
