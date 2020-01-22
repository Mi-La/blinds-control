/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from "react";
import {
    StyleSheet,
    SafeAreaView,
    View,
    Text,
    TextInput,
    Button,
    Alert,
    AppState,
    TouchableOpacity
} from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Swiper from "react-native-swiper";
import AsyncStorage from "@react-native-community/async-storage";

const DEFAULT_IP="";

const OpacityButton = (props) => {
    const { title = "PRESS", disabled = false, style, titleStyle, disabledStyle, disabledTitleStyle,
            onPress, opacity = 0.5 } = props;

    const defaultStyles = StyleSheet.create({
        button: {
            borderRadius: 2,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#2196F3",
            elevation: 4
        },
        title: {
            textTransform: "uppercase",
            fontWeight: '500',
            color: "white",
            margin: 8
        },
        disabledButton: {
            backgroundColor: "#dfdfdf"
        },
        disabledTitle: {
            color: "#a1a1a1"
        }
    });

    composedStyle = [ defaultStyles.button, style ];
    if (disabled) {
        composedStyle.push(defaultStyles.disabledButton);
        composedStyle.push(disabledStyle);
    }

    composedTitleStyle = [ defaultStyles.title, titleStyle ];
    if (disabled) {
        composedTitleStyle.push(defaultStyles.disabledTitle);
        composedTitleStyle.push(disabledTitleStyle);
    }

    return (
        <TouchableOpacity onPress={onPress} style={composedStyle} activeOpacity={opacity}
                disabled={disabled}>
            <Text style={composedTitleStyle}>{title}</Text>
        </TouchableOpacity>
    );
}

const DefaultControllers = () => {
    return (
        <View style={styles.controller}>
            <View style={styles.controllerHeading}>
                <Text style={styles.controllerName}></Text>
                <OpacityButton style={[styles.progButton]} titleStyle={[styles.progButtonTitle]} title="P"
                        disabled={true}/>
            </View>
            <View style={styles.buttons}>
                <OpacityButton title="Up" style={styles.button} disabled={true}/>
                <OpacityButton title="My" style={styles.buttonMy} disabled={true}/>
                <OpacityButton title="Down" style={styles.button} disabled={true}/>
            </View>
        </View>
    );
}

const defaultConstrollers = (<DefaultControllers/>);

export default class BlindsControl extends Component {
    constructor() {
        super();

        this.state = {
            status: "disconnected",
            ip: DEFAULT_IP,
            controllers: defaultConstrollers
        };
        this.connection = null;
        this.lastCommand = "";

        AsyncStorage.getItem("ip").then((value) => {
            if (value == null) {
                AsyncStorage.setItem("ip", this.state.ip);
            } else {
                this.setState({ip: value});
            }
        });
    }

    componentDidMount = () => {
        AppState.addEventListener('change', this.appStateChanged);
    }

    componentWillUnmount = () => {
        AppState.removeEventListener('change', this.appStateChanged);
    }

    appStateChanged = (state) => {
        console.log("state chaged:", state);
        if (state == "active") {
            AsyncStorage.getItem("connected").then((value) => {
                if (value == "1") {
                    this.connectTcp(true);
                }
            });
        } else {
            if (this.state.status == "connected") {
                this.disconnectTcp(true);
            }
        }
    }

    connectButtonPress = () => {
        if (this.state.status != "connected") {
            this.connectTcp();
        } else {
            this.disconnectTcp();
        }
    }

    ipChanged = (value) => {
        this.setState({"ip": value});
        AsyncStorage.setItem("ip", value);
    }

    connectTcp = (fromAppState = false) => {
        AsyncStorage.getItem("ip").then((ip) => {
            console.log("connectTcp", ip);
            this.connection = TcpSocket.createConnection({ host: ip, port: 1234 });
            this.connection.on("connect", () => {
                this.setState({ status: "connected" });
                this.createControllers();
            });
            this.connection.on("error", (msg) => {
                Alert.alert("Connection error!", msg);
                this.disconnectTcp();
            });
            this.connection.on("data", this.dataCallback);

            if (!fromAppState) {
                return AsyncStorage.setItem("connected", "1");
            }
        })
    }

    disconnectTcp = (fromAppState = false) => {
        console.log("disconnectTcp");
        this.connection && this.connection.destroy();
        this.connection = null
        this.setState({ status: "disconnected" });
        this.removeControllers();

        if (!fromAppState) {
            return AsyncStorage.setItem("connected", "0");
        }
    }

    sendCommand = (command) => {
        this.lastCommand = command;
        console.log(command);
        try {
            this.connection.write(command);
        } catch (err) {
            Alert.alert("Failed to send command!", err.message);
            this.disconnectTcp();
        }
    }

    buttonPress = (name, button) => {
        this.sendCommand(`broadcast ${name} ${button};`);
    }

    dataCallback = (data) => {
        console.log(`Got response for command '${this.lastCommand}'.`)
        if (this.lastCommand.startsWith("list"))
        {
            let list = data.toString();
            try {
                list = JSON.parse(list);
            } catch (err) {
                Alert.alert("Failed to parse controllers list!", err);
            }

            console.log(`Found ${list.length} controllers.`);

            if (list.length == 0) {
                Alert.alert("No controllers found!");
                return;
            }

            let controllers = []
            for (let i = 0; i < list.length; ++i) {
                const controller = list[i];
                controllers.push(
                    <View key={i} style={styles.controller}>
                        <View style={styles.controllerHeading}>
                            <Text style={styles.controllerName}>{controller.name}</Text>
                            <OpacityButton style={styles.progButton} titleStyle={styles.progButtonTitle}
                                    title="P" onPress={this.buttonPress.bind(this, controller.name, "prog")}/>
                        </View>
                        <View style={styles.buttons}>
                            <OpacityButton title="Up" style={styles.button}
                                    onPress={this.buttonPress.bind(this, controller.name, "up")}/>
                            <OpacityButton title="My" style={styles.buttonMy}
                                    onPress={this.buttonPress.bind(this, controller.name, "my")}/>
                            <OpacityButton title="Down" style={styles.button}
                                    onPress={this.buttonPress.bind(this, controller.name, "down")}/>
                        </View>
                    </View>
                );
            }

            let controllersSwiper = (
                <Swiper showsButtons={true} index={5}>
                    {controllers}
                </Swiper>
            );

            this.setState({controllers: controllersSwiper});
        } else {
            console.log(data.toString());
        }

        this.lastCommand = "";
    };

    createControllers = () => {
        this.lastCommand = "list;";
        try {
            this.connection.write("list;");
        } catch (err) {
            Alert.alert("Failed to fetch controllers!", err.message);
            this.disconnectTcp();
        }
    }

    removeControllers = () => {
        this.setState({ controllers: defaultConstrollers });
    }

    render() {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.title}>
                    <Text style={styles.title}>Blinds Control</Text>
                </View>
                <View style={styles.status}>
                    <TextInput style={styles.statusText} placeholder="IP ADDRESS"
                            onChangeText={this.ipChanged} value={this.state.ip}/>
                    <Text style={styles.statusText}>{this.state.status}</Text>
                </View>
                <View>
                    <Button title={this.state.status == "connected" ? "Disconnect" : "Connect"}
                            onPress={this.connectButtonPress}/>
                </View>
                {this.state.controllers}
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        backgroundColor: "lightgrey"
    },
    status: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "lightgrey",
    },
    statusText: {
        fontSize: 16,
        textAlignVertical: "center",
    },
    controller: {
        flex: 1,
        alignItems: "center"
    },
    controllerHeading: {
        flexDirection: "row",
        height: 40,
        width: "100%",
        alignItems: "center"
    },
    progButton: {
        height: 30,
        width: 30,
        borderRadius: 15,
        backgroundColor: "grey",
        position: "absolute",
        right: 10
    },
    progButtonTitle: {
        fontSize: 12,
        color: "black",
        margin: 0
    },
    controllerName: {
        fontSize: 24,
        width: "100%",
        textAlign: "center"
    },
    buttons: {
        flex: 1,
        width: "100%",
        flexDirection: "column",
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: 40 // controllerHeading.height
    },
    button: {
        height: "20%",
        width: "30%",
        borderRadius: 50
    },
    buttonMy: {
        height: "25%",
        width: "40%",
        borderRadius: 60
    }
});
