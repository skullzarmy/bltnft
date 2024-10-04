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

    // Minting control
    bool public mintable;
    uint256 public maxMintable;
    uint256 public mintedCount;

    // Admin Address
    address public adminAddress;

    // Dynamic Thumbnail URI (updateable)
    string public thumbnailURI;

    // Events
    event MintingStatusChanged(bool mintable);
    event MaxMintableUpdated(uint256 maxMintable);
    event ThumbnailURIUpdated(string newThumbnailURI);
    event ClaimInitiated(address indexed claimer, uint256 tokenId, uint256 quantity);
    event ClaimFailed(address indexed claimer, string reason);
    event ProcessClaimStep(string step);
    event TokenVerificationFailed(string tokenName, string reason);
    event TokenTransferred(address indexed tokenAddress, uint256 amount);
    event NFTOwnershipVerified(address indexed nftContract, uint256 tokenId);

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
        uint256 _tomatoRequired,
        uint256 _maxMintable,
        string memory _thumbnailURI
    ) ERC1155LazyMint(_defaultAdmin, _name, _symbol, _royaltyRecipient, _royaltyBps) {
        mayoTokenDetails = TokenDetails(IERC20(_mayoToken), _mayoCost);
        baconTokenDetails = TokenDetails(IERC20(_baconToken), _baconCost);
        breadTokenDetails = TokenDetails(IERC20(_breadToken), _breadCost);

        lettuceNFT = IERC721(_lettuceNFT);
        tomatoNFT = IERC721(_tomatoNFT);

        lettuceRequired = _lettuceRequired;
        tomatoRequired = _tomatoRequired;
        paymentRecipient = _paymentRecipient;

        mintable = true;
        maxMintable = _maxMintable;
        mintedCount = 0;

        _setupRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);

        // Set initial thumbnail URI
        thumbnailURI = _thumbnailURI;
    }

    // Function to update the image URI (only admin)
    function setThumbnailURI(string memory _newThumbnailURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        thumbnailURI = _newThumbnailURI;
        emit ThumbnailURIUpdated(_newThumbnailURI);
    }

    // Override the `uri()` function to return dynamic metadata as JSON
    function uri(uint256 _tokenId) public view override returns (string memory) {
        return generateMetadataJSON(_tokenId);
    }

    // Generate dynamic metadata JSON for each token
    function generateMetadataJSON(uint256 _tokenId) public view returns (string memory) {
        // Create metadata fields (dynamic)
        string memory name = string(abi.encodePacked("BLTNFT #", (_tokenId + 1).toString()));
        string memory description = "A delicious BLT tokenized and immortal on the blockchain!";
        string memory image = thumbnailURI;

        // Return metadata in the standard JSON format
        return string(abi.encodePacked(
            '{',
                '"name": "', name, '",',
                '"description": "', description, '",',
                '"image": "', image, '"',
            '}'
        ));
    }

    // Function to change the mintable flag (only admin)
    function setMintable(bool _mintable) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintable = _mintable;
        emit MintingStatusChanged(_mintable);
    }

    // Function to update the maxMintable amount (only admin)
    function setMaxMintable(uint256 _maxMintable) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxMintable = _maxMintable;
        emit MaxMintableUpdated(_maxMintable);
    }

    // Custom claim function for minting BLT
    function claimBLT(
        address _receiver,
        uint256 _tokenId,
        uint256 _quantity,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds
    ) public payable {
        require(mintable, "Minting is not allowed at this time");
        require(mintedCount + _quantity <= maxMintable, "Max mintable tokens exceeded");

        emit ClaimInitiated(msg.sender, _tokenId, _quantity);

        // Ensure token ID matches exactly the next token to mint
        if (_tokenId != nextTokenIdToMint()) {
            emit ClaimFailed(msg.sender, "Invalid token ID");
            revert("Invalid token ID");
        }

        // Verify claim eligibility
        try this._verifyClaim(msg.sender, _lettuceTokenIds, _tomatoTokenIds, _quantity) {
            emit ProcessClaimStep("Claim verification passed");
        } catch Error(string memory reason) {
            emit ClaimFailed(msg.sender, reason);
            revert(reason);
        }

        // Process claim
        try this._processClaim(_receiver, _tokenId, _quantity, _lettuceTokenIds, _tomatoTokenIds) {
            emit ProcessClaimStep("Claim processing completed");
        } catch Error(string memory reason) {
            emit ClaimFailed(msg.sender, reason);
            revert(reason);
        }

        // Update minted count
        mintedCount += _quantity;

        emit TokensClaimed(msg.sender, _receiver, _tokenId, _quantity);
    }

    // Verification methods for claim process
    function _verifyClaim(
        address _claimer,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds,
        uint256 _quantity
    ) external {
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
    ) internal {
        for (uint256 i = 0; i < _requiredAmount; i++) {
            if (_nftContract.ownerOf(_tokenIds[i]) != _claimer) {
                emit ClaimFailed(_claimer, "Claimer does not own required NFT");
                revert("Claimer does not own required NFT");
            }
            emit NFTOwnershipVerified(address(_nftContract), _tokenIds[i]);
        }
    }

    function _verifyTokenBalance(
        address _claimer,
        TokenDetails memory _tokenDetails,
        uint256 _quantity,
        string memory _tokenName
    ) internal {
        if (_tokenDetails.token.balanceOf(_claimer) < _tokenDetails.costPerToken * _quantity) {
            emit TokenVerificationFailed(_tokenName, "Insufficient balance");
            revert(string(abi.encodePacked("Insufficient ", _tokenName, " tokens")));
        }
    }

    function _processClaim(
        address _receiver,
        uint256 _tokenId,
        uint256 _quantity,
        uint256[] calldata _lettuceTokenIds,
        uint256[] calldata _tomatoTokenIds
    ) external {
        _burnNFTs(_receiver, _lettuceTokenIds, _tomatoTokenIds);
        _transferTokens(_receiver, _quantity);
        _mintTokens(_receiver, _tokenId, _quantity);
    }

    function _transferTokens(address _receiver, uint256 _quantity) internal {
        _safeTransferFrom(mayoTokenDetails, _receiver, _quantity);
        _safeTransferFrom(baconTokenDetails, _receiver, _quantity);
        _safeTransferFrom(breadTokenDetails, _receiver, _quantity);
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

    function _safeTransferFrom(TokenDetails memory _tokenDetails, address _receiver, uint256 _quantity) internal {
        _tokenDetails.token.transferFrom(_receiver, paymentRecipient, _tokenDetails.costPerToken * _quantity);
        emit TokenTransferred(address(_tokenDetails.token), _tokenDetails.costPerToken * _quantity);
    }

    function _mintTokens(address _receiver, uint256 _tokenId, uint256 _quantity) internal {
        _mint(_receiver, _tokenId, _quantity, "");
        totalSupply[_tokenId] += _quantity;
    }
}
