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

class DefaultControllers extends Component {
    render() {
        return (
            <Swiper>
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
            </Swiper>
        );
    }
}

const DEFAULT_CONTROLLERS = (<DefaultControllers/>);

const DEFAULT_PERSISTENCY = {
    connected: false,
    ip: "",
    controllerIndex: 0
};

const PERSISTENCY_KEY = "BlindsControl.Persistency";

function fetchPersistency() {
    return AsyncStorage.getItem(PERSISTENCY_KEY).then((value) => {
        let persistency = DEFAULT_PERSISTENCY;
        if (value) {
            try {
                persistency = JSON.parse(value);
                console.log("fetched persistency:", persistency);
            } catch (err) {
                console.warn("Persistency is not valied JSON, using default persistency!");
            }
        }

        return persistency;
    });
}

function savePersistency(persistency) {
    console.log("saving persistency:", persistency);
    return AsyncStorage.setItem(PERSISTENCY_KEY, JSON.stringify(persistency));
}

export default class BlindsControl extends Component {
    constructor() {
        super();

        this.connection = null;
        this.currentCommand = "";
        this.persistency = DEFAULT_PERSISTENCY;

        // state for UI
        this.state = {
            status: "disconnected",
            controllers: DEFAULT_CONTROLLERS,
            ip: this.persistency.ip
        };
    }

    componentDidMount() {
        AppState.addEventListener('change', this.onAppStateChanged);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.onAppStateChanged);
    }

    connectTcp(fromAppState = false) {
        console.log("connectTcp", this.persistency.ip, " (ui: ", this.state.ip, ")");
        this.connection = TcpSocket.createConnection({ host: this.persistency.ip, port: 1234 });
        this.connection.on("connect", () => {
            this.setState({ status: "connected" });
            this.listConstrollers();
        });
        this.connection.on("error", (msg) => {
            Alert.alert("Connection error!", msg);
            this.disconnectTcp();
        });
        this.connection.on("data", this.onDataCallback);

        if (!fromAppState) {
            this.persistency.connected = true;
        }
    }

    disconnectTcp(fromAppState = false) {
        console.log("disconnectTcp");
        this.connection && this.connection.destroy();
        this.connection = null
        this.setState({ status: "disconnected" });
        this.removeControllers();

        if (!fromAppState) {
            this.persistency.connected = false;
        }
    }

    sendCommand(command) {
        this.currentCommand = command;
        console.log(command);
        try {
            this.connection.write(command);
        } catch (err) {
            Alert.alert("Failed to send command!", err.message);
            this.disconnectTcp();
        }
    }

    createControllers(data) {
        let list = null;
        try {
            list = JSON.parse(data.toString());
        } catch (err) {
            Alert.alert("Failed to parse controllers list!", err);
            this.disconnectTcp();
            return;
        }

        if (list.length == 0) {
            Alert.alert("No controllers found!");
            this.disconnectTcp();
            return;
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
                                title="P" onPress={this.onButtonPress.bind(this, controller.name, "prog")}/>
                    </View>
                    <View style={styles.buttons}>
                        <OpacityButton title="Up" style={styles.button}
                                onPress={this.onButtonPress.bind(this, controller.name, "up")}/>
                        <OpacityButton title="My" style={styles.buttonMy}
                                onPress={this.onButtonPress.bind(this, controller.name, "my")}/>
                        <OpacityButton title="Down" style={styles.button}
                                onPress={this.onButtonPress.bind(this, controller.name, "down")}/>
                    </View>
                </View>
            );
        }

        let swiper = (
            <Swiper showsButtons={controllers.length > 1} index={this.persistency.controllerIndex}
                    onIndexChanged={(index)=> { this.persistency.controllerIndex = index; }}>
                {controllers}
            </Swiper>
        );

        this.setState({controllers: swiper});
    }

    listConstrollers() {
        this.currentCommand = "list;";
        try {
            this.connection.write("list;"); // will be processed in onDataCallback
        } catch (err) {
            Alert.alert("Failed to fetch controllers!", err.message);
            this.disconnectTcp();
        }
    }

    removeControllers() {
        this.setState({ controllers: DEFAULT_CONTROLLERS });
    }

    render() {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.title}>
                    <Text style={styles.title}>Blinds Control</Text>
                </View>
                <View style={styles.status}>
                    <TextInput style={styles.statusText} placeholder="IP ADDRESS"
                            onChangeText={this.onIPChanged} value={this.state.ip}/>
                    <Text style={styles.statusText}>{this.state.status}</Text>
                </View>
                <View>
                    <Button title={this.state.status == "connected" ? "Disconnect" : "Connect"}
                            onPress={this.onConnectButtonPress}/>
                </View>
                {this.state.controllers}
            </SafeAreaView>
        );
    }

    // callbacks

    onAppStateChanged = (state) => {
        console.log("state chaged:", state);

        if (state == "active") {
            return fetchPersistency().then((persistency) => {
                this.persistency = persistency;
                this.setState({ ip: this.persistency.ip });
                if (this.persistency.connected) {
                    this.connectTcp(true);
                }
            });
        } else {
            if (this.state.status == "connected") {
                this.disconnectTcp(true);
            }
            return savePersistency(this.persistency);
        }
    }

    onConnectButtonPress = () => {
        if (this.state.status != "connected") {
            this.connectTcp();
        } else {
            this.disconnectTcp();
        }
    }

    onIPChanged = (value) => {
        this.persistency.ip = value;
        this.setState({ ip: this.persistency.ip });
    }

    onButtonPress = (name, button) => {
        this.sendCommand(`broadcast ${name} ${button};`);
    }

    onDataCallback = (data) => {
        console.log(`Got response for command '${this.currentCommand}'.`)
        if (this.currentCommand.startsWith("list")) {
            this.createControllers(data.toString());
        } else {
            console.log(data.toString());
        }

        this.currentCommand = "";
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        backgroundColor: "#c6c2b6"
    },
    status: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#c6c2b6"
    },
    statusText: {
        fontSize: 16,
        textAlignVertical: "center"
    },
    controller: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#c6c2b6"
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
