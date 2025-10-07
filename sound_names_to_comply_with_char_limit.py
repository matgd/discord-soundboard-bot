#!/usr/bin/env python3

import sys
from pathlib import Path

CHAR_LIMIT = 80
SOUND_DIR = Path("sounds")

def get_mp3_files(directory: Path) -> list[Path]:
    """Get a list of .mp3 files in the specified directory."""
    return list(directory.glob("*.mp3"))

def shorten_filename(filename: Path) -> Path:
    """Shorten the filename to comply with the character limit."""
    if len(filename.name) <= CHAR_LIMIT:
        return filename

    name, ext = filename.stem, filename.suffix
    shortened_name = name[:CHAR_LIMIT - len(ext)] + ext
    return filename.with_name(shortened_name)


if __name__ == "__main__":
    mp3_files = get_mp3_files(SOUND_DIR)
    for mp3_file in mp3_files:
        new_filename = shorten_filename(mp3_file)
        if new_filename != mp3_file:
            print(f"Renaming {mp3_file} to {new_filename}")
            _ = mp3_file.rename(new_filename)
        else:
            print(f"No change needed for {mp3_file}")
    sys.exit(0)


# === Tests === #
# python -m unittest <this_file>

from unittest import TestCase

class Test(TestCase):
    def test_shorten_filename(self):
        """Test the shorten_filename function."""
        p = Path
        test_cases = [
            (p("short_name.mp3"), p("short_name.mp3")),
            (p("1234567890" * 9 + "ABC.mp3"), p("1234567890" * 7 + "123456.mp3")),
            (p("A" * 75 + ".mp3"), p("A" * 75 + ".mp3")),
            (p("A" * 76 + ".mp3"), p("A" * 76 + ".mp3")),
            (p("A" * 77 + ".mp3"), p("A" * 76 + ".mp3")),
        ]

        for original, expected in test_cases:
            result = shorten_filename(original)
            assert result == expected, f"Expected {expected}, got {result}"
