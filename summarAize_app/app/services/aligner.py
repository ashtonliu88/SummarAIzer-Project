from aeneas.task import Task
from aeneas.executetask import ExecuteTask
from pathlib import Path
import uuid

GENERATED = Path(__file__).resolve().parent.parent / "generated_audios"
ALIGN_DIR = GENERATED / "alignments"
ALIGN_DIR.mkdir(parents=True, exist_ok=True)

def align(audio_path: Path, text_path: Path, lang: str = "eng") -> Path:
    """
    Run Aeneas forced alignment and return JSON path.
    """
    out_path = ALIGN_DIR / f"{uuid.uuid4().hex}.json"
    conf = (
        f"task_language={lang}|"
        "is_text_type=plain|"
        "os_task_file_format=json"
    )
    t = Task(config_string=conf)
    t.audio_file_path_absolute = str(audio_path)
    t.text_file_path_absolute  = str(text_path)
    t.sync_map_file_path_absolute = str(out_path)

    ExecuteTask(t).execute()
    t.output_sync_map_file()
    return out_path
