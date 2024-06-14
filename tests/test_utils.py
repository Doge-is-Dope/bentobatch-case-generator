import unittest
from utils.data_utils import DataUtils


class TestUtils(unittest.TestCase):

    def setUp(self):
        self.data_utils = DataUtils()

    def test_get_network_info_by_name(self):
        res1 = self.data_utils.get_network_info_by_name("Polygon")
        self.assertIsNotNone(res1)
        assert res1 is not None
        self.assertEqual(res1.id, 137)

        res2 = self.data_utils.get_network_info_by_name("Gnosis")
        self.assertIsNone(res2)

    def test_get_network_info_by_id(self):
        res1 = self.data_utils.get_network_info_by_id(137)
        self.assertIsNotNone(res1)
        assert res1 is not None
        self.assertEqual(res1.name, "polygon")

        res2 = self.data_utils.get_network_info_by_id(123)
        self.assertIsNone(res2)

    def test_get_supported_actions(self):
        supported_actions = self.data_utils.get_supported_actions()
        self.assertEqual(len(supported_actions), 2)

        self.assertIsNotNone(supported_actions.get("transfer"))

        self.assertIsNone(supported_actions.get("wtf"))

        action_desc = supported_actions["transfer"]
        self.assertEqual(
            action_desc,
            "You are about to send {amount} {token} to {receiver} on {chain}.",
        )


if __name__ == "__main__":
    unittest.main()
