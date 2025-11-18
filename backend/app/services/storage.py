import io
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import aioboto3
from botocore.client import Config

from ..config import Settings, get_settings


@dataclass
class R2ObjectInfo:
    key: str
    size: int
    etag: Optional[str]
    last_modified: Optional[str]


class R2StorageClient:
    """
    Thin wrapper around Cloudflare R2 (S3-compatible) using aioboto3.
    """

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._session = aioboto3.Session()

    def _verify_settings(self) -> None:
        required = [
            self.settings.r2_account_id,
            self.settings.r2_access_key_id,
            self.settings.r2_secret_access_key,
            self.settings.r2_bucket_name,
        ]
        if not all(required):
            missing = [
                "R2_ACCOUNT_ID",
                "R2_ACCESS_KEY_ID",
                "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET_NAME",
            ]
            raise RuntimeError(
                "Missing Cloudflare R2 configuration. Ensure the following env variables are set: "
                + ", ".join(missing)
            )

    def _endpoint_url(self) -> str:
        return f"https://{self.settings.r2_account_id}.r2.cloudflarestorage.com"

    async def _client(self):
        self._verify_settings()
        return self._session.client(
            "s3",
            endpoint_url=self._endpoint_url(),
            aws_access_key_id=self.settings.r2_access_key_id,
            aws_secret_access_key=self.settings.r2_secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    async def upload_bytes(self, key: str, data: bytes, content_type: Optional[str] = None) -> str:
        async with self._client() as client:
            params = {"Bucket": self.settings.r2_bucket_name, "Key": key, "Body": data}
            if content_type:
                params["ContentType"] = content_type
            await client.put_object(**params)
        return key

    async def upload_stream(
        self,
        key: str,
        stream: io.BytesIO,
        content_type: Optional[str] = None,
    ) -> str:
        async with self._client() as client:
            params = {
                "Bucket": self.settings.r2_bucket_name,
                "Key": key,
                "Body": stream,
            }
            if content_type:
                params["ContentType"] = content_type
            await client.upload_fileobj(stream, self.settings.r2_bucket_name, key, ExtraArgs={"ContentType": content_type} if content_type else None)
        return key

    async def delete_object(self, key: str) -> None:
        async with self._client() as client:
            await client.delete_object(Bucket=self.settings.r2_bucket_name, Key=key)

    async def generate_presigned_url(self, key: str, expires_in: int = 900) -> str:
        async with self._client() as client:
            return await client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.settings.r2_bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )

    async def list_objects(self, prefix: str = "") -> AsyncIterator[R2ObjectInfo]:
        async with self._client() as client:
            paginator = client.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self.settings.r2_bucket_name, Prefix=prefix):
                for obj in page.get("Contents", []):
                    yield R2ObjectInfo(
                        key=obj["Key"],
                        size=obj.get("Size", 0),
                        etag=obj.get("ETag"),
                        last_modified=obj.get("LastModified"),
                    )


storage_client = R2StorageClient()


