// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SpaceLaunchCoinFlip is Ownable {
    enum CoinSide {
        SUN,
        MOON
    }

    IERC20 public fuelToken;

    event CoinFlipped(
        address indexed player, uint256 betAmount, CoinSide chosenSide, CoinSide result, bool won, uint256 reward
    );

    constructor(address tokenAddress) Ownable(msg.sender) {
        fuelToken = IERC20(tokenAddress);
    }

    /// @notice Player chooses SUN or MOON
    function flipCoin(uint256 betAmount, CoinSide chosenSide) external {
        require(betAmount > 0, "Bet amount must be greater than 0");

        require(fuelToken.balanceOf(msg.sender) >= betAmount, "Insufficient fuel balance");

        require(uint256(chosenSide) <= uint256(CoinSide.MOON), "Invalid coin side");

        // Transfer the bet amount from the player to the contract
        bool success = fuelToken.transferFrom(msg.sender, address(this), betAmount);

        require(success, "Token transfer failed");

        // Temporary pseudorandomness - will be replaced with Chainlink VRF
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 2;

        CoinSide result = CoinSide(random);

        bool won = (chosenSide == result);
        uint256 reward = 0;

        if (won) {
            reward = betAmount * 2;

            require(fuelToken.balanceOf(address(this)) >= reward, "Game pool dry, contract needs more fuel");

            bool payoutSuccess = fuelToken.transfer(msg.sender, reward);
            require(payoutSuccess, "Reward transfer failed");
        }

        emit CoinFlipped(msg.sender, betAmount, chosenSide, result, won, reward);
    }

    /// @notice Allows the owner to withdraw tokens from the game reward pool
    function withdrawPool(uint256 amount) external onlyOwner {
        bool success = fuelToken.transfer(msg.sender, amount);
        require(success, "Pool withdrawal failed");
    }
}
