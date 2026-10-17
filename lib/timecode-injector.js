/**
 * Injects a professional QuickTime/MP4 hardware timecode track (tmcd + tref)
 * into an MP4 file in pure stream mode with zero video re-encoding.
 */
import { open, rename, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { scanTopLevelBoxes } from './stream-scanner.js';

function readBoxes(b, start, end, cb) {
  let o = start;
  while (o + 8 <= end) {
    let sz = b.readUInt32BE(o);
    const ty = b.toString('ascii', o + 4, o + 8);
    let hd = 8;
    if (sz === 1) { sz = Number(b.readBigUInt64BE(o + 8)); hd = 16; }
    else if (sz === 0) sz = end - o;
    if (sz < hd || o + sz > end) break;
    cb({ type: ty, start: o, end: o + sz, size: sz, header: hd, content: o + hd });
    o += sz;
  }
}

export function patchTimecodeTrack(mp4Buffer, options = {}) {
  const buf = Buffer.isBuffer(mp4Buffer) ? mp4Buffer : Buffer.from(mp4Buffer);
  const fileSize = Number.isSafeInteger(options.fileSize) && options.fileSize >= buf.length
    ? options.fileSize
    : buf.length;
  const noPatch = () => options.parts ? { changed: false } : buf;
  
  // 1. Scan top level boxes
  let moov = null;
  readBoxes(buf, 0, buf.length, (b) => {
    if (b.type === 'moov') moov = b;
  });
  if (!moov) return noPatch();

  // 2. Scan traks inside moov
  let videoTrak = null;
  let maxTrackId = 0;
  let videoTimescale = 19200;
  let videoDuration = 0;

  readBoxes(buf, moov.content, moov.end, (mbox) => {
    if (mbox.type === 'trak') {
      readBoxes(buf, mbox.content, mbox.end, (tbox) => {
        if (tbox.type === 'tkhd') {
          const ver = buf[tbox.content];
          const trkId = buf.readUInt32BE(tbox.content + (ver === 1 ? 20 : 12));
          if (trkId > maxTrackId) maxTrackId = trkId;
        }
        if (tbox.type === 'mdia') {
          readBoxes(buf, tbox.content, tbox.end, (mdbox) => {
            if (mdbox.type === 'hdlr') {
              const hdlr = buf.toString('ascii', mdbox.content + 8, mdbox.content + 12);
              if (hdlr === 'vide') videoTrak = mbox;
            }
            if (mdbox.type === 'mdhd') {
              const ver = buf[mdbox.content];
              const ts = buf.readUInt32BE(mdbox.content + (ver === 1 ? 20 : 12));
              const dur = ver === 1 ? Number(buf.readBigUInt64BE(mdbox.content + 24)) : buf.readUInt32BE(mdbox.content + 16);
              videoTimescale = ts || 19200;
              videoDuration = dur || 0;
            }
          });
        }
      });
    }
  });

  if (!videoTrak) return noPatch();

  // Check if tmcd already exists
  let hasTmcd = false;
  readBoxes(buf, moov.content, moov.end, (mbox) => {
    if (mbox.type === 'trak') {
      readBoxes(buf, mbox.content, mbox.end, (tbox) => {
        if (tbox.type === 'mdia') {
          readBoxes(buf, tbox.content, tbox.end, (mdbox) => {
            if (mdbox.type === 'hdlr' && buf.toString('ascii', mdbox.content + 8, mdbox.content + 12) === 'tmcd') {
              hasTmcd = true;
            }
          });
        }
      });
    }
  });
  if (hasTmcd) return noPatch();

  const timecodeTrackId = maxTrackId + 1;
  const trefBox = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x14]), // size 20
    Buffer.from('tref', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x0c]), // size 12
    Buffer.from('tmcd', 'ascii'),
    Buffer.alloc(4) // track ID filled below
  ]);
  trefBox.writeUInt32BE(timecodeTrackId, 16);

  // Build the tmcd trak buffer (411 bytes)
  const tmcdTrak = Buffer.alloc(411);
  // trak header
  tmcdTrak.writeUInt32BE(411, 0);
  tmcdTrak.write('trak', 4, 'ascii');

  // tkhd (size 92)
  tmcdTrak.writeUInt32BE(92, 8);
  tmcdTrak.write('tkhd', 12, 'ascii');
  tmcdTrak[16] = 0; // version 0
  tmcdTrak[19] = 3; // flags 0x000003
  tmcdTrak.writeUInt32BE(timecodeTrackId, 28); // track id
  tmcdTrak.writeUInt32BE(1, 48); // matrix identity
  tmcdTrak.writeUInt32BE(1, 64);
  tmcdTrak.writeUInt32BE(0x40000000, 84);

  // mdia (size 311)
  tmcdTrak.writeUInt32BE(311, 100);
  tmcdTrak.write('mdia', 104, 'ascii');

  // mdhd (size 32)
  tmcdTrak.writeUInt32BE(32, 108);
  tmcdTrak.write('mdhd', 112, 'ascii');
  tmcdTrak.writeUInt32BE(videoTimescale, 128); // timescale matching video
  tmcdTrak.writeUInt32BE(videoDuration, 132); // duration matching video
  tmcdTrak.writeUInt16BE(0x55c4, 136); // language 'und'

  // hdlr (size 33)
  tmcdTrak.writeUInt32BE(33, 140);
  tmcdTrak.write('hdlr', 144, 'ascii');
  tmcdTrak.write('mhlr', 152, 'ascii'); // QuickTime media handler component type
  tmcdTrak.write('tmcd', 156, 'ascii'); // handler subtype

  // minf (size 238)
  tmcdTrak.writeUInt32BE(238, 173);
  tmcdTrak.write('minf', 177, 'ascii');

  // gmhd (size 40)
  tmcdTrak.writeUInt32BE(40, 181);
  tmcdTrak.write('gmhd', 185, 'ascii');
  tmcdTrak.writeUInt32BE(24, 189);
  tmcdTrak.write('gmin', 193, 'ascii');
  tmcdTrak.writeUInt32BE(8, 213);
  tmcdTrak.write('text', 217, 'ascii');

  // dinf (size 36)
  tmcdTrak.writeUInt32BE(36, 221);
  tmcdTrak.write('dinf', 225, 'ascii');
  tmcdTrak.writeUInt32BE(28, 229);
  tmcdTrak.write('dref', 233, 'ascii');
  tmcdTrak.writeUInt32BE(1, 241); // entry count 1
  tmcdTrak.writeUInt32BE(12, 245);
  tmcdTrak.write('url ', 249, 'ascii');
  tmcdTrak.writeUInt32BE(1, 257); // flags 1

  // stbl (size 154)
  tmcdTrak.writeUInt32BE(154, 257);
  tmcdTrak.write('stbl', 261, 'ascii');

  // stsd (size 50)
  tmcdTrak.writeUInt32BE(50, 265);
  tmcdTrak.write('stsd', 269, 'ascii');
  tmcdTrak.writeUInt32BE(1, 277); // count 1
  tmcdTrak.writeUInt32BE(34, 281);
  tmcdTrak.write('tmcd', 285, 'ascii');
  tmcdTrak.writeUInt16BE(1, 295); // dref index 1
  tmcdTrak.writeUInt32BE(videoTimescale, 303);
  tmcdTrak.writeUInt32BE(10, 307); // frame duration placeholder
  tmcdTrak[311] = 60; // fps

  // stts (size 24)
  tmcdTrak.writeUInt32BE(24, 315);
  tmcdTrak.write('stts', 319, 'ascii');
  tmcdTrak.writeUInt32BE(1, 327); // count 1
  tmcdTrak.writeUInt32BE(1, 331);
  tmcdTrak.writeUInt32BE(10, 335);

  // stsc (size 28)
  tmcdTrak.writeUInt32BE(28, 339);
  tmcdTrak.write('stsc', 343, 'ascii');
  tmcdTrak.writeUInt32BE(1, 351);
  tmcdTrak.writeUInt32BE(1, 355);
  tmcdTrak.writeUInt32BE(1, 359);
  tmcdTrak.writeUInt32BE(1, 363);

  // stsz (size 24)
  tmcdTrak.writeUInt32BE(24, 367);
  tmcdTrak.write('stsz', 371, 'ascii');
  tmcdTrak.writeUInt32BE(4, 379); // sample size 4
  tmcdTrak.writeUInt32BE(1, 383); // count 1

  // stco (size 20)
  tmcdTrak.writeUInt32BE(20, 391);
  tmcdTrak.write('stco', 395, 'ascii');
  tmcdTrak.writeUInt32BE(1, 403);
  // chunk offset filled during assembly

  // Total moov growth = trefBox.length (20) + tmcdTrak.length (411) = 431 bytes
  const moovGrowth = trefBox.length + tmcdTrak.length;
  // Sample data at EOF (12 bytes mdat)
  const tmcdSampleBox = Buffer.from([0x00, 0x00, 0x00, 0x0c, 0x6d, 0x64, 0x61, 0x74, 0x00, 0x00, 0x00, 0x00]);

  // When moov expands by moovGrowth, all chunk offsets pointing past moov need +moovGrowth
  const sampleChunkOffset = fileSize + moovGrowth + 8; // points to 4 bytes data inside tmcdSampleBox
  tmcdTrak.writeUInt32BE(sampleChunkOffset, 407);

  // Shift existing chunk offsets in all traks
  const newMoovParts = [];
  readBoxes(buf, moov.content, moov.end, (mbox) => {
    if (mbox.type === 'mvhd') {
      const mv = Buffer.from(buf.subarray(mbox.start, mbox.end));
      const ver = buf[mbox.content];
      const nextTrkOffset = ver === 1 ? 108 : 96;
      mv.writeUInt32BE(timecodeTrackId + 1, nextTrkOffset);
      newMoovParts.push(mv);
      return;
    }
    if (mbox.type === 'trak') {
      const trkBuf = Buffer.from(buf.subarray(mbox.start, mbox.end));
      // Shift offsets inside this trak
      readBoxes(buf, mbox.content, mbox.end, (tbox) => {
        if (tbox.type === 'mdia') {
          readBoxes(buf, tbox.content, tbox.end, (mdbox) => {
            if (mdbox.type === 'minf') {
              readBoxes(buf, mdbox.content, mdbox.end, (mfbox) => {
                if (mfbox.type === 'stbl') {
                  readBoxes(buf, mfbox.content, mfbox.end, (sbox) => {
                    const local = (abs) => abs - mbox.start;
                    if (sbox.type === 'stco') {
                      const count = buf.readUInt32BE(sbox.content + 4);
                      let at = sbox.content + 8;
                      for (let i = 0; i < count; i++) {
                        trkBuf.writeUInt32BE(buf.readUInt32BE(at) + moovGrowth, local(at));
                        at += 4;
                      }
                    } else if (sbox.type === 'co64') {
                      const count = buf.readUInt32BE(sbox.content + 4);
                      let at = sbox.content + 8;
                      for (let i = 0; i < count; i++) {
                        trkBuf.writeBigUInt64BE(buf.readBigUInt64BE(at) + BigInt(moovGrowth), local(at));
                        at += 8;
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });

      // If this is the video trak, inject tref
      if (mbox.start === videoTrak.start) {
        // Expand trak size by trefBox.length
        const expandedVideoTrak = Buffer.concat([
          trkBuf.subarray(0, 4), // old size
          trkBuf.subarray(4, 8), // 'trak'
          trkBuf.subarray(8),
          trefBox
        ]);
        expandedVideoTrak.writeUInt32BE(trkBuf.length + trefBox.length, 0);
        newMoovParts.push(expandedVideoTrak);
      } else {
        newMoovParts.push(trkBuf);
      }
      return;
    }
    newMoovParts.push(Buffer.from(buf.subarray(mbox.start, mbox.end)));
  });

  newMoovParts.push(tmcdTrak);

  const innerMoovContent = Buffer.concat(newMoovParts);
  const newMoovBox = Buffer.concat([
    Buffer.alloc(8),
    innerMoovContent
  ]);
  newMoovBox.writeUInt32BE(newMoovBox.length, 0);
  newMoovBox.write('moov', 4, 'ascii');

  if (options.parts) {
    return {
      changed: true,
      moovStart: moov.start,
      moovEnd: moov.end,
      newMoovBox,
      tmcdSampleBox,
      moovGrowth,
    };
  }

  return Buffer.concat([
    buf.subarray(0, moov.start),
    newMoovBox,
    buf.subarray(moov.end),
    tmcdSampleBox
  ]);
}

/**
 * Add the timecode track without loading the video payload into RAM.
 * The optimizer's remux step places `moov` before `mdat`; only that metadata
 * atom is buffered. The media payload is copied as a stream to a sibling temp
 * file, then the completed file replaces the original.
 */
export async function patchTimecodeTrackFile(filePath) {
  const fh = await open(filePath, 'r');
  let fileSize;
  let moov;
  let firstMdat;
  let moovBuffer;
  try {
    const fileStat = await fh.stat();
    fileSize = fileStat.size;
    const boxes = await scanTopLevelBoxes(fh, fileSize);
    moov = boxes.find((box) => box.type === 'moov');
    firstMdat = boxes.find((box) => box.type === 'mdat');
    if (!moov || !firstMdat) throw new Error('Timecode injection requires moov and mdat boxes.');
    if (moov.start >= firstMdat.start) {
      throw new Error('Timecode injection requires faststart layout (moov before mdat).');
    }
    moovBuffer = Buffer.alloc(moov.size);
    let offset = 0;
    while (offset < moov.size) {
      const { bytesRead } = await fh.read(moovBuffer, offset, moov.size - offset, moov.start + offset);
      if (!bytesRead) throw new Error('Could not read complete moov box for timecode injection.');
      offset += bytesRead;
    }
  } finally {
    await fh.close();
  }

  const patch = patchTimecodeTrack(moovBuffer, { fileSize, parts: true });
  if (!patch.changed) return { changed: false, fileSize };

  const tempPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmcd-tmp`);
  async function* outputChunks() {
    if (moov.start > 0) {
      for await (const chunk of createReadStream(filePath, { start: 0, end: moov.start - 1 })) yield chunk;
    }
    yield patch.newMoovBox;
    if (moov.end < fileSize) {
      for await (const chunk of createReadStream(filePath, { start: moov.end, end: fileSize - 1 })) yield chunk;
    }
    yield patch.tmcdSampleBox;
  }

  try {
    await pipeline(Readable.from(outputChunks()), createWriteStream(tempPath, { flags: 'wx' }));
    try {
      await rename(tempPath, filePath);
    } catch (error) {
      if (process.platform !== 'win32') throw error;
      const backupPath = `${filePath}.${randomUUID()}.tmcd-backup`;
      await rename(filePath, backupPath);
      try {
        await rename(tempPath, filePath);
        await rm(backupPath, { force: true });
      } catch (replaceError) {
        await rename(backupPath, filePath).catch(() => {});
        throw replaceError;
      }
    }
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }

  return { changed: true, fileSize: fileSize + patch.moovGrowth + patch.tmcdSampleBox.length };
}
