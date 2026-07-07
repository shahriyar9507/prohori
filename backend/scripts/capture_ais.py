"""Capture a real AIS snapshot over the Bay of Bengal from aisstream.io.

Connects to the aisstream websocket, collects live vessel positions inside the
Bangladesh EEZ bounding box for a fixed window, and writes a snapshot JSON.
This grounds SHOMUDRO in real ship positions (the key stays out of the repo).

    cd backend && .venv/Scripts/python.exe scripts/capture_ais.py <API_KEY> [seconds]
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import websockets

# Bay of Bengal / Bangladesh EEZ box: [[[south_lat, west_lon], [north_lat, east_lon]]]
BBOX = [[[18.0, 88.0], [22.8, 93.2]]]
OUT = Path(__file__).resolve().parent / "ais_snapshot.json"


async def capture(api_key: str, seconds: int) -> list[dict]:
    vessels: dict[str, dict] = {}
    url = "wss://stream.aisstream.io/v0/stream"
    async with websockets.connect(url, ping_interval=None) as ws:
        await ws.send(json.dumps({
            "APIKey": api_key,
            "BoundingBoxes": BBOX,
            "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
        }))
        try:
            async with asyncio.timeout(seconds):
                async for raw in ws:
                    msg = json.loads(raw)
                    mt = msg.get("MessageType")
                    meta = msg.get("MetaData", {})
                    mmsi = str(meta.get("MMSI") or "")
                    if not mmsi:
                        continue
                    v = vessels.setdefault(mmsi, {"mmsi": mmsi})
                    if mt == "PositionReport":
                        pr = msg["Message"]["PositionReport"]
                        v.update({
                            "lat": pr.get("Latitude"), "lon": pr.get("Longitude"),
                            "sog": pr.get("Sog"), "cog": pr.get("Cog"),
                        })
                        name = (meta.get("ShipName") or "").strip()
                        if name:
                            v["name"] = name
                    elif mt == "ShipStaticData":
                        sd = msg["Message"]["ShipStaticData"]
                        dim = sd.get("Dimension", {}) or {}
                        length = (dim.get("A", 0) + dim.get("B", 0)) or None
                        if length:
                            v["length_m"] = length
                        if (sd.get("Name") or "").strip():
                            v["name"] = sd["Name"].strip()
                        if sd.get("Type"):
                            v["type_code"] = sd["Type"]
        except (asyncio.TimeoutError, TimeoutError):
            pass
    out = [v for v in vessels.values() if v.get("lat") is not None and v.get("lon") is not None]
    return out


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: capture_ais.py <API_KEY> [seconds]")
        sys.exit(1)
    api_key = sys.argv[1]
    seconds = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    vessels = asyncio.run(capture(api_key, seconds))
    OUT.write_text(json.dumps(vessels, indent=2), encoding="utf-8")
    print(f"captured {len(vessels)} vessels -> {OUT}")
    for v in vessels[:8]:
        print(f"  {v['mmsi']} {v.get('name','?'):<20} {v['lat']:.3f},{v['lon']:.3f} sog={v.get('sog')}")


if __name__ == "__main__":
    main()
