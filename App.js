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
    const { title = "PRESS", style, titleStyle, onPress } = props;

    const defaultStyles = StyleSheet.create({
        button: {
            borderRadius: 2,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#2196F3"
        },
        title: {
            fontSize: 18,
            textTransform: "uppercase",
            color: "white",
        }
    });

    return (
        <TouchableOpacity onPress={onPress} style={[defaultStyles.button, style]}>
            <Text style={[defaultStyles.title, titleStyle]}>{title}</Text>
        </TouchableOpacity>
    );
}

export default class BlindsControl extends Component {
    constructor() {
        super();

        this.state = {
            status: "disconnected",
            ip: DEFAULT_IP,
            controllers: null
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
        if (state == "active")
            this.connectTcp();
        else
            this.disconnectTcp();
    }

    connectButtonPress = () => {
        if (this.state.status != "connected")
            this.connectTcp();
        else
            this.disconnectTcp();
    }

    ipChanged = (value) => {
        AsyncStorage.setItem("ip", value).then(() => {
            this.setState({"ip": value});
        });
    }

    connectTcp = () => {
        AsyncStorage.getItem("ip").then((ip) => {
            console.log("connectTcp", ip);
            this.connection = TcpSocket.createConnection({ host: ip, port: 1234 });
            this.connection.on("connect", () => {
                this.setState({ status: "connected" });
                this.createControllers();
            });
            this.connection.on("error", (msg) => {
                Alert.alert("Connection error!", msg);
            });
            this.connection.on("data", this.dataCallback);
        })
    }

    disconnectTcp = () => {
        console.log("disconnectTcp");
        this.connection.destroy();
        this.connection = null
        this.setState({ status: "disconnected" });
        this.removeControllers();
    }

    sendCommand = (command) => {
        this.lastCommand = command;
        console.log(command);
        this.connection.write(command);
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
                            <Button title="Up"
                                    onPress={this.buttonPress.bind(this, controller.name, "up")}/>
                            <Button title="My"
                                    onPress={this.buttonPress.bind(this, controller.name, "my")}/>
                            <Button title="Down"
                                    onPress={this.buttonPress.bind(this, controller.name, "down")}/>
                        </View>
                    </View>
                );
            }

            let controllersSwiper = (
                <Swiper showsButtons={true}>
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
        this.connection.write("list;");
    }

    removeControllers = () => {
        this.setState({ controllers: null });
    }

    render() {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.title}>
                    <Text style={styles.title}>Blinds Control</Text>
                </View>
                <View style={styles.status}>
                    <TextInput style={styles.statusText} placeholder="IP ADDRESS"
                            onChangeText={this.ipChanged}>{this.state.ip}</TextInput>
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
        textAlign: "right",
        textAlignVertical: "center",
    },
    controller: {
        flex: 1,
        alignItems: "center"
    },
    controllerHeading: {
        flexDirection: "row",
        width: "100%",
    },
    progButton: {
        height: 20,
        width: 20,
        borderRadius: 10,
        backgroundColor: "grey",
        position: "absolute",
        right: 10,
        top: 10,
        elevation: 1
    },
    progButtonTitle: {
        fontSize: 10,
        color: "black"
    },
    controllerName: {
        height: 40,
        fontSize: 24,
        fontWeight: "bold",
        textAlignVertical: "center",
        width: "100%",
        textAlign: "center"
    },
    buttons: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "space-around"
    }
});
