from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class WebsiteDraftUpdate(BaseModel):
    draft: dict = Field(default_factory=dict)
    expectedUpdatedAt: datetime | None = None


class WebsitePreviewTokenRequest(BaseModel):
    mode: Literal["draft", "published"] = "draft"
    path: str = "/"


class WebsitePublishRequest(BaseModel):
    expectedUpdatedAt: datetime | None = None


class WebsiteScheduleRequest(BaseModel):
    expectedUpdatedAt: datetime | None = None
    publishAt: datetime


class WebsiteDiscardRequest(BaseModel):
    expectedUpdatedAt: datetime | None = None


class WebsiteRestoreRequest(BaseModel):
    expectedUpdatedAt: datetime | None = None
