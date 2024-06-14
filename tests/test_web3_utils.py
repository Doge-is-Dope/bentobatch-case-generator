import unittest

from web3_utils import erc20_utils


class TestWeb3Utils(unittest.TestCase):

    def setUp(self):
        self.erc20_utils = erc20_utils.ERC20Utils()

    def test_encode_transfer(self):
        result = self.erc20_utils.encode_erc20_transfer(
            token="0x8E50bf47FF159b19C808D15E6eDFf57Dee6e9B44",
            recipient="0x00e5DF023726d46F689F157E29d2586FCE0Ca1eD",
            amount=1000000,
        )
        self.assertEqual(
            result,
            "0xa9059cbb00000000000000000000000000e5df023726d46f689f157e29d2586fce0ca1ed00000000000000000000000000000000000000000000000000000000000f4240",
        )


if __name__ == "__main__":
    unittest.main()
