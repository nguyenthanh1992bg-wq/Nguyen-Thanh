"""Test logic không cần tài khoản: bộ não, lịch đăng. Chạy: python -m unittest discover -s tests"""
import json, os, sys, tempfile, unittest
from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

os.environ["AGENT_DATA"] = tempfile.mkdtemp()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agent import brain, state, main, llm


class T(unittest.TestCase):
    def test_brain_learns_and_rolls_back(self):
        fake = {"lessons": [{"rule": "Hook luôn có punch giữa hook", "why": "QA", "confidence": 0.8, "evidence": 1, "source": "qa"}], "summary": "ok", "changes": ["+ L01"]}
        with mock.patch.object(llm, "ask", side_effect=lambda *a, **k: json.dumps(fake)):
            s, ch = brain.reflect("edit", {"x": 1})
            self.assertEqual(s, "ok")
            fake["lessons"].append({"rule": "Chữ không đè miệng", "confidence": 0.9, "source": "owner"})
            brain.reflect("owner_feedback", {"feedback": "chữ đè miệng"})
        self.assertEqual(len(brain.load_lessons()), 2)
        self.assertIn("Chữ không đè miệng", brain.rules_for_prompt())
        self.assertTrue(brain.BRAIN_MD.exists())
        self.assertTrue(brain.rollback())
        self.assertEqual(len(brain.load_lessons()), 1)

    def test_brain_survives_llm_failure(self):
        with mock.patch.object(llm, "ask", side_effect=RuntimeError("down")):
            s, _ = brain.reflect("edit", {})
        self.assertIn("không cập nhật", s)

    def test_slots_post_once(self):
        ag = main.Agent.__new__(main.Agent)
        ag.tz = ZoneInfo("Asia/Ho_Chi_Minh")
        calls = []
        ag.post_next = lambda label: calls.append(label) or True
        ag.now = lambda: datetime(2026, 11, 27, 8, 5, tzinfo=ag.tz)
        ag.check_slots(); ag.check_slots()
        self.assertEqual(calls, ["08:00"])
        ag.now = lambda: datetime(2026, 11, 27, 20, 0, tzinfo=ag.tz)
        ag.check_slots()
        self.assertEqual(calls, ["08:00", "20:00"])
        ag.now = lambda: datetime(2026, 11, 28, 12, 0, tzinfo=ag.tz)
        ag.check_slots()
        self.assertEqual(len(calls), 2)


if __name__ == "__main__":
    unittest.main()
