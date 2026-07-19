pragma solidity ^0.8.0;
contract FarmCert {
    mapping(bytes32 => bool) public certified;
    event Certified(bytes32 hash);
    function certifyPlant(bytes32 hash) public {
        certified[hash] = true;
        emit Certified(hash);
    }
}
