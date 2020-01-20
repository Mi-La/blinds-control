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
    AppState
} from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Swiper from "react-native-swiper";

const DEFAULT_IP="10.0.2.2";

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

    connect = () => {
        if (this.state.status != "connected")
            this.connectTcp();
        else
            this.disconnectTcp();
    }

    connectTcp = () => {
        console.log("connectTcp", this.state.ip);
        this.connection = TcpSocket.createConnection({ host: this.state.ip, port: 1234 });
        this.connection.on("connect", () => {
            this.setState({ status: "connected" });
            this.createControllers();
        });
        this.connection.on("error", () => {
            this.setState({ status: "error" });
        });
        this.connection.on("data", this.dataCallback);
    }

    disconnectTcp = () => {
        console.log("disconnectTcp");
        this.connection.destroy();
        this.connection = null
        this.setState({ status: "disconnected" });
        this.removeControllers();
    }

    buttonPress = (name, button) => {
        console.log("press", name, button);
        this.lastCommand = `broadcast ${name} ${button};`;
        this.connection.write(`broadcast ${name} ${button};`);
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
                            <Button color="lightgrey" title="Prog"
                                    onPress={this.buttonPress.bind(this, controller.name, "prog")}/>
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
                            onChangeText={(text) => { this.state.ip = text }}>{DEFAULT_IP}</TextInput>
                    <Text style={styles.statusText}>{this.state.status}</Text>
                </View>
                <View>
                    <Button title={this.state.status == "connected" ? "Disconnect" : "Connect"}
                            onPress={this.connect}/>
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
        textAlign: "center",
        backgroundColor: "lightblue"
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
        flexDirection: "row"
    },
    controllerName: {
        height: 40,
        fontSize: 24,
        fontWeight: "bold",
        textAlignVertical: "center"
    },
    buttons: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "space-around",
    }
});
