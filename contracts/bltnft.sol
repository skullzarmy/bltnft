// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@thirdweb-dev/contracts/base/ERC1155LazyMint.sol";
import "@thirdweb-dev/contracts/extension/Permissions.sol";
import "@thirdweb-dev/contracts/eip/interface/IERC20.sol";
import "@thirdweb-dev/contracts/eip/interface/IERC721.sol";

contract CustomERC1155LazyMint is ERC1155LazyMint, Permissions {
    using Strings for uint256;

    struct TokenDetails {
        IERC20 token;
        uint256 costPerToken;
    }

    // ERC20 tokens and their costs
    TokenDetails public mayoTokenDetails;
    TokenDetails public baconTokenDetails;
    TokenDetails public breadTokenDetails;

    // ERC721 tokens (lettuce and tomato)
    IERC721 public lettuceNFT;
    IERC721 public tomatoNFT;

    // Costs and requirements
    uint256 public lettuceRequired;
    uint256 public tomatoRequired;

    // Payment recipient for ERC20 tokens
    address public paymentRecipient;

    // Events
    event RequirementsUpdated(
        uint256 lettuceRequired,
        uint256 tomatoRequired,
        uint256 mayoCost,
        uint256 baconCost,
        uint256 breadCost
    );
    event TokensBurned(address indexed owner, uint256 indexed tokenId, uint256 amount);

    constructor(
        address _defaultAdmin,
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps,
        address _mayoToken,
        uint256 _mayoCost,
        address _baconToken,
        uint256 _baconCost,
        address _breadToken,
        uint256 _breadCost,
        address _lettuceNFT,
        address _tomatoNFT,
        address _paymentRecipient,
        uint256 _lettuceRequired,
        uint256 _tomatoRequired
    ) ERC1155LazyMint(_defaultAdmin, _name, _symbol, _royaltyRecipient, _royaltyBps) {
        mayoTokenDetails = TokenDetails(IERC20(_mayoToken), _mayoCost);
        baconTokenDetails = TokenDetails(IERC20(_baconToken), _baconCost);
        breadTokenDetails = TokenDetails(IERC20(_breadToken), _breadCost);

        lettuceNFT = IERC721(_lettuceNFT);
        tomatoNFT = IERC721(_tomatoNFT);

        lettuceRequired = _lettuceRequired;
        tomatoRequired = _tomatoRequired;
        paymentRecipient = _paymentRecipient;
    }

    function setRequirements(
        uint256 _lettuceRequired,
        uint256 _tomatoRequired,
        uint256 _mayoCost,
        uint256 _baconCost,
        uint256 _breadCost
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lettuceRequired = _lettuceRequired;
        tomatoRequired = _tomatoRequired;
        mayoTokenDetails.costPerToken = _mayoCost;
        baconTokenDetails.costPerToken = _baconCost;
        breadTokenDetails.costPerToken = _breadCost;

        emit RequirementsUpdated(_lettuceRequired, _tomatoRequired, _mayoCost, _baconCost, _breadCost);
    }

    function claim(
        address _receiver,
        uint256 _tokenId,
        uint256 _quantity,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds
    ) public payable virtual {
        require(_tokenId < nextTokenIdToMint(), "Invalid token ID");

        // Verify claim eligibility
        _verifyClaim(msg.sender, _lettuceTokenIds, _tomatoTokenIds, _quantity);

        // Process claim
        _processClaim(_receiver, _tokenId, _quantity, _lettuceTokenIds, _tomatoTokenIds);

        emit TokensClaimed(msg.sender, _receiver, _tokenId, _quantity);
    }

    function _verifyClaim(
        address _claimer,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds,
        uint256 _quantity
    ) internal view {
        require(_lettuceTokenIds.length == lettuceRequired, "Incorrect number of Lettuce NFTs");
        require(_tomatoTokenIds.length == tomatoRequired, "Incorrect number of Tomato NFTs");

        _verifyNFTOwnership(_claimer, _lettuceTokenIds, lettuceNFT, lettuceRequired);
        _verifyNFTOwnership(_claimer, _tomatoTokenIds, tomatoNFT, tomatoRequired);

        _verifyTokenBalance(_claimer, mayoTokenDetails, _quantity, "MAYO");
        _verifyTokenBalance(_claimer, baconTokenDetails, _quantity, "BACON");
        _verifyTokenBalance(_claimer, breadTokenDetails, _quantity, "BREAD");
    }

    function _verifyNFTOwnership(
        address _claimer,
        uint256[] calldata _tokenIds,
        IERC721 _nftContract,
        uint256 _requiredAmount
    ) internal view {
        for (uint256 i = 0; i < _requiredAmount; i++) {
            require(_nftContract.ownerOf(_tokenIds[i]) == _claimer, "Claimer does not own required NFT");
        }
    }

    function _verifyTokenBalance(
        address _claimer,
        TokenDetails memory _tokenDetails,
        uint256 _quantity,
        string memory _tokenName
    ) internal view {
        require(
            _tokenDetails.token.balanceOf(_claimer) >= _tokenDetails.costPerToken * _quantity,
            string(abi.encodePacked("Insufficient ", _tokenName, " tokens"))
        );
    }

    function _processClaim(
        address _receiver,
        uint256 _tokenId,
        uint256 _quantity,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds
    ) internal {
        _burnNFTs(_receiver, _lettuceTokenIds, _tomatoTokenIds);
        _transferTokens(_receiver, _quantity);
        _mintTokens(_receiver, _tokenId, _quantity);
    }

    function _burnNFTs(
        address _receiver,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds
    ) internal {
        for (uint256 i = 0; i < _lettuceTokenIds.length; i++) {
            lettuceNFT.transferFrom(_receiver, address(0xdead), _lettuceTokenIds[i]);
        }
        for (uint256 i = 0; i < _tomatoTokenIds.length; i++) {
            tomatoNFT.transferFrom(_receiver, address(0xdead), _tomatoTokenIds[i]);
        }
    }

    function _transferTokens(address _receiver, uint256 _quantity) internal {
        _safeTransferFrom(mayoTokenDetails, _receiver, _quantity);
        _safeTransferFrom(baconTokenDetails, _receiver, _quantity);
        _safeTransferFrom(breadTokenDetails, _receiver, _quantity);
    }

    function _safeTransferFrom(TokenDetails memory _tokenDetails, address _receiver, uint256 _quantity) internal {
        _tokenDetails.token.transferFrom(_receiver, paymentRecipient, _tokenDetails.costPerToken * _quantity);
    }

    function _mintTokens(address _receiver, uint256 _tokenId, uint256 _quantity) internal {
        _mint(_receiver, _tokenId, _quantity, "");
        totalSupply[_tokenId] += _quantity;
    }

    function burn(address _owner, uint256 _tokenId, uint256 _amount) external override {
        address caller = msg.sender;

        require(caller == _owner || isApprovedForAll[_owner][caller], "Unapproved caller");
        require(balanceOf[_owner][_tokenId] >= _amount, "Not enough tokens owned");

        _burn(_owner, _tokenId, _amount);
        totalSupply[_tokenId] -= _amount;

        emit TokensBurned(_owner, _tokenId, _amount);
    }
}
