// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract SpaceFuelToken is ERC20, ERC20Burnable, Ownable {
    uint256 public immutable maxSupply;

    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18;
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address => uint256) public lastClaimAt;

    event FaucetClaimed(address indexed recipient, uint256 amount);
    event FaucetFunded(address indexed owner, uint256 amount);

    constructor(string memory name, string memory symbol, uint256 initialSupply, uint256 maxSupply_)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        require(initialSupply <= maxSupply_, "Initial supply exceeds max supply");

        maxSupply = maxSupply_ * 10 ** decimals();

        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /// @notice Only the owner can mint tokens up to the maximum supply
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");

        _mint(to, amount);
    }

    /// @notice Allows the owner to fund the faucet reserve
    function fundFaucet(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");

        _transfer(msg.sender, address(this), amount);

        emit FaucetFunded(msg.sender, amount);
    }

    /// @notice Allows users to claim 100 tokens every 24 hours
    function claimFaucet() external {
        require(block.timestamp >= lastClaimAt[msg.sender] + FAUCET_COOLDOWN, "Faucet cooldown active");

        require(balanceOf(address(this)) >= FAUCET_AMOUNT, "Faucet empty");

        lastClaimAt[msg.sender] = block.timestamp;

        _transfer(address(this), msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
