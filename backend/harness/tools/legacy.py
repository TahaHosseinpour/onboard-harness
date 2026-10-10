"""Old Office files (.doc, .ppt): get the text out of the pre-2007 binary formats.

These files are still everywhere in company archives. They are not zipped XML
like .docx; they are a small file system (OLE) holding binary streams, and the
text has to be dug out of those. Only reading is supported - new files are
always written in the current formats. (.xls is read in `tables.py`.)

The text comes out plain: paragraphs, table cells and slide order survive;
fonts, pictures and layout do not.
"""

from __future__ import annotations

import re
import struct
from pathlib import Path

# Word marks a field as  0x13 instruction 0x14 visible-result 0x15 ; only the result is text.
_FIELD_CODE = re.compile(r"\x13[^\x13\x14\x15]*\x14|\x13[^\x13\x14\x15]*\x15|\x15")
_CONTROL = re.compile(r"[\x00-\x06\x08\x0c\x0e-\x1f]")


def read_doc(path: Path) -> str:
    """The body text of a Word 97-2003 document."""
    import olefile

    if not olefile.isOleFile(str(path)):
        raise ValueError("this is not a Word 97-2003 file (it may be a .docx or .rtf saved with a .doc name)")
    with olefile.OleFileIO(str(path)) as ole:
        if not ole.exists("WordDocument"):
            raise ValueError("this file has no Word document inside")
        word = ole.openstream("WordDocument").read()
        flags = struct.unpack_from("<H", word, 0x0A)[0]
        if flags & 0x0100:
            raise ValueError("this document is protected with a password")
        table_name = "1Table" if flags & 0x0200 else "0Table"
        if not ole.exists(table_name):
            raise ValueError("this Word file is damaged or older than Word 97")
        table = ole.openstream(table_name).read()

    body_length = struct.unpack_from("<i", word, 0x4C)[0]  # characters of main text, before footnotes and headers
    clx_offset, clx_size = struct.unpack_from("<ii", word, 0x01A2)
    clx = table[clx_offset : clx_offset + clx_size]

    # The Clx is optional property blocks (type 1) followed by the piece table (type 2).
    position = 0
    while position < len(clx) and clx[position] == 1:
        position += 3 + struct.unpack_from("<H", clx, position + 1)[0]
    if position >= len(clx) or clx[position] != 2:
        raise ValueError("this Word file is damaged (no text table)")
    size = struct.unpack_from("<I", clx, position + 1)[0]
    pieces = clx[position + 5 : position + 5 + size]
    count = (len(pieces) - 4) // 12
    starts = struct.unpack_from(f"<{count + 1}I", pieces, 0)

    text: list[str] = []
    for index in range(count):
        characters = starts[index + 1] - starts[index]
        location = struct.unpack_from("<I", pieces, (count + 1) * 4 + index * 8 + 2)[0]
        if location & 0x40000000:  # one byte per character
            offset = (location & 0x3FFFFFFF) // 2
            text.append(word[offset : offset + characters].decode("cp1252", errors="replace"))
        else:  # two bytes per character
            text.append(word[location : location + characters * 2].decode("utf-16-le", errors="replace"))
    body = "".join(text)[: body_length if body_length > 0 else None]

    body = _FIELD_CODE.sub("", body)
    # \x07 ends a table cell (and, doubled, a row); \r ends a paragraph; \x0b is a line break.
    body = body.replace("\x07\x07", "\n").replace("\x07", " | ").replace("\r", "\n").replace("\x0b", "\n")
    body = _CONTROL.sub("", body)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(line.strip() for line in body.split("\n"))).strip()


def read_ppt(path: Path) -> str:
    """The text of a PowerPoint 97-2003 presentation, slide by slide."""
    import olefile

    if not olefile.isOleFile(str(path)):
        raise ValueError("this is not a PowerPoint 97-2003 file")
    with olefile.OleFileIO(str(path)) as ole:
        if ole.exists("EncryptedSummary"):
            raise ValueError("this presentation is protected with a password")
        if not ole.exists("PowerPoint Document"):
            raise ValueError("this file has no presentation inside")
        data = ole.openstream("PowerPoint Document").read()

    lines: list[str] = []
    slide = 0

    def walk(start: int, end: int) -> None:
        nonlocal slide
        position = start
        while position + 8 <= end:
            version, kind, length = struct.unpack_from("<HHI", data, position)
            content, after = position + 8, position + 8 + length
            if after > end:
                return
            if kind == 4000:  # TextCharsAtom
                lines.append(data[content:after].decode("utf-16-le", errors="replace"))
            elif kind == 4008:  # TextBytesAtom
                lines.append(data[content:after].decode("latin-1"))
            elif kind == 1016 or kind == 4080:
                pass  # the master and the outline lists: placeholder prompts and copies, not the slides' own text
            elif version & 0x0F == 0x0F:  # a container
                if kind == 1006:  # Slide
                    slide += 1
                    lines.append(f"--- slide {slide} ---")
                elif kind == 1008:  # Notes
                    lines.append("(speaker notes)")
                walk(content, after)
            position = after

    walk(0, len(data))
    cleaned = [re.sub(r"[\x00-\x08\x0c\x0e-\x1f]", "", line.replace("\r", "\n").replace("\x0b", "\n")).strip() for line in lines]
    return "\n".join(line for line in cleaned if line).strip()
