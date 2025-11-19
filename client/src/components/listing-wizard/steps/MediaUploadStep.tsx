          <Button type="button">
            Select Primary {displayMediaType === 'image' ? 'Image' : 'Video'}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Supported: {displayMediaType === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV'} (Select multiple files with Ctrl/Cmd)
          </p>