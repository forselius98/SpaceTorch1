
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SpaceLaunchCoinFlip.sol";

contract DeployCoinFlip is Script {
    address constant TOKEN_ADDRESS =
        0x2e59788EE9A102dc1f7ADaAd6E0e2dFeCB8A60DB;

    function run() external returns (SpaceLaunchCoinFlip coinFlip) {
        vm.startBroadcast();

        coinFlip = new SpaceLaunchCoinFlip(TOKEN_ADDRESS);

        vm.stopBroadcast();

        console2.log("SpaceLaunchCoinFlip deployed at:", address(coinFlip));
    }
}
