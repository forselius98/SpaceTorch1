// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MemeToken.sol";
import "../src/SpaceLaunchCoinFlip.sol";

contract SpaceFuelTest is Test {
    SpaceFuelToken token;
    SpaceLaunchCoinFlip game;

    address owner = address(1);
    address user = address(2);
    address secondUser = address(3);

    uint256 constant ONE_TOKEN = 10 ** 18;
    uint256 constant FAUCET_AMOUNT = 100 * ONE_TOKEN;

    function setUp() public {
        vm.warp(1_000_000);

        vm.startPrank(owner);

        // Deploy token with initial supply and max supply
        token = new SpaceFuelToken("Space Fuel", "FUEL", 1000, 1_000_000);

        // Fund the faucet reserve with 500 FUEL
        token.fundFaucet(500 * ONE_TOKEN);

        // Deploy game contract
        game = new SpaceLaunchCoinFlip(address(token));

        vm.stopPrank();
    }

    function testFaucet() public {
        vm.prank(user);
        token.claimFaucet();

        assertEq(token.balanceOf(user), FAUCET_AMOUNT);
        assertEq(token.balanceOf(address(token)), 400 * ONE_TOKEN);
    }

    function testFaucetCooldownFail() public {
        vm.startPrank(user);

        token.claimFaucet();

        // Claiming again immediately should revert
        vm.expectRevert("Faucet cooldown active");
        token.claimFaucet();

        vm.stopPrank();
    }

    function testFaucetAfter24Hours() public {
        vm.startPrank(user);

        token.claimFaucet();

        vm.warp(block.timestamp + 1 days);

        token.claimFaucet();

        assertEq(token.balanceOf(user), 200 * ONE_TOKEN);

        vm.stopPrank();
    }

    function testFaucetEmpty() public {
        // First user claims all remaining faucet tokens
        vm.startPrank(user);

        token.claimFaucet();
        vm.warp(block.timestamp + 1 days);
        token.claimFaucet();
        vm.warp(block.timestamp + 1 days);
        token.claimFaucet();
        vm.warp(block.timestamp + 1 days);
        token.claimFaucet();
        vm.warp(block.timestamp + 1 days);
        token.claimFaucet();

        vm.stopPrank();

        // Faucet reserve should now be empty
        assertEq(token.balanceOf(address(token)), 0);

        // Another user cannot claim from an empty faucet
        vm.prank(secondUser);
        vm.expectRevert("Faucet empty");
        token.claimFaucet();
    }

    function testUnauthorizedMintFails() public {
        vm.prank(user);

        vm.expectRevert();
        token.mint(user, 500);
    }

    function testCoinFlipWithSunChoice() public {
        vm.startPrank(user);

        token.claimFaucet();
        token.approve(address(game), 50 * ONE_TOKEN);

        vm.stopPrank();

        // Owner funds the game reward pool
        vm.prank(owner);
        token.mint(address(game), 1000 * ONE_TOKEN);

        // Player chooses SUN
        vm.prank(user);
        game.flipCoin(50 * ONE_TOKEN, SpaceLaunchCoinFlip.CoinSide.SUN);
    }

    function testCoinFlipWithMoonChoice() public {
        vm.startPrank(user);

        token.claimFaucet();
        token.approve(address(game), 50 * ONE_TOKEN);

        vm.stopPrank();

        // Owner funds the game reward pool
        vm.prank(owner);
        token.mint(address(game), 1000 * ONE_TOKEN);

        // Player chooses MOON
        vm.prank(user);
        game.flipCoin(50 * ONE_TOKEN, SpaceLaunchCoinFlip.CoinSide.MOON);
    }
}

