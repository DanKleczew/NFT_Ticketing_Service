// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Ticket} from "../src/Ticket.sol";

contract TicketScript is Script {
    Ticket public ticket;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        ticket = new Ticket(
            vm.envString("TICKET_NAME"),
            vm.envString("TICKET_SYMBOL"),
            vm.envUint("TICKET_MAX_SUPPLY"),
            vm.envString("TICKET_URI"),
            vm.envUint("TICKET_PRICE")
        );

        vm.stopBroadcast();
    }
}
