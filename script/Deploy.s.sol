// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MemeToken.sol";

contract Deploy is Script {
    function run() external returns (SpaceFuelToken token) {
        vm.startBroadcast();

        token = new SpaceFuelToken("Space Fuel", "FUEL", 900_000, 1_000_000);

        token.fundFaucet(100_000 * 10 ** 18);

        vm.stopBroadcast();
    }
}

