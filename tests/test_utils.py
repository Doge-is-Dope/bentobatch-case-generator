import unittest
from utils import data_utils


class TestUtils(unittest.TestCase):

    def test_get_supported_actions(self):
        supported_actions = data_utils.get_supported_actions()
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
