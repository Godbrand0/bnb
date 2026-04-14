// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

contract MockRouter {
    uint256 public priceRatio; // amount of tokenOut per tokenIn (scaled by 1e18)

    constructor(uint256 _priceRatio) {
        priceRatio = _priceRatio;
    }

    function setPriceRatio(uint256 _priceRatio) public {
        priceRatio = _priceRatio;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        MockERC20 tokenIn = MockERC20(path[0]);
        MockERC20 tokenOut = MockERC20(path[path.length - 1]);

        uint8 decimalsIn = tokenIn.decimals();
        uint8 decimalsOut = tokenOut.decimals();

        uint256 amountOut = (amountIn * priceRatio) / 1e18;
        
        // Adjust for decimal differences
        if (decimalsIn > decimalsOut) {
            amountOut = amountOut / (10 ** (decimalsIn - decimalsOut));
        } else if (decimalsOut > decimalsIn) {
            amountOut = amountOut * (10 ** (decimalsOut - decimalsIn));
        }

        require(amountOut >= amountOutMin, "Insufficient output amount");

        tokenIn.transferFrom(msg.sender, address(this), amountIn);
        tokenOut.mint(to, amountOut);

        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }
}
